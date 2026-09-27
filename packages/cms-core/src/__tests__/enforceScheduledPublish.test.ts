import { describe, expect, it } from "vitest";
import { enforceScheduledPublish } from "../hooks/enforceScheduledPublish";

// Minimal fixture matching the subset of `BeforeChangeHook` arguments the
// hook actually reads. Cast through `unknown` since Payload's full argument
// shape (collection config, PayloadRequest, ...) is irrelevant here.
function callHook(args: {
  data: Record<string, unknown>;
  originalDoc?: Record<string, unknown>;
  context?: Record<string, unknown>;
}) {
  return enforceScheduledPublish({
    data: args.data,
    originalDoc: args.originalDoc,
    context: args.context ?? {},
  } as unknown as Parameters<typeof enforceScheduledPublish>[0]);
}

describe("enforceScheduledPublish", () => {
  it("leaves data untouched when _status is not published", () => {
    const data = { _status: "draft", publishAt: "2999-01-01T00:00:00.000Z" };
    expect(callHook({ data })).toEqual(data);
  });

  it("leaves data untouched when there is no publishAt", () => {
    const data = { _status: "published" };
    expect(callHook({ data })).toEqual(data);
  });

  it("forces a document with a future publishAt back to draft even though the caller asked for published", () => {
    const data = { _status: "published", publishAt: "2999-01-01T00:00:00.000Z" };
    const result = callHook({ data }) as Record<string, unknown>;
    expect(result._status).toBe("draft");
  });

  it("allows publishing when publishAt is in the past", () => {
    const data = { _status: "published", publishAt: "2000-01-01T00:00:00.000Z" };
    const result = callHook({ data }) as Record<string, unknown>;
    expect(result._status).toBe("published");
  });

  it("falls back to originalDoc.publishAt when the update payload omits it", () => {
    const data = { _status: "published" };
    const originalDoc = { publishAt: "2999-01-01T00:00:00.000Z" };
    const result = callHook({ data, originalDoc }) as Record<string, unknown>;
    expect(result._status).toBe("draft");
  });

  it("bypasses the guard when the scheduler marks the request as authorized", () => {
    const data = { _status: "published", publishAt: "2999-01-01T00:00:00.000Z" };
    const result = callHook({
      data,
      context: { allowScheduledPublish: true },
    }) as Record<string, unknown>;
    expect(result._status).toBe("published");
  });
});
