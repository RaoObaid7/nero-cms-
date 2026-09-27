import { describe, expect, it, vi } from "vitest";

vi.mock("../get-payload-client", () => ({
  getPayloadClient: vi.fn(),
}));

const { getPayloadClient } = await import("../get-payload-client");
const { contentClient } = await import("../content-client");

/**
 * The Payload adapter is intentionally not exported, so these tests drive it
 * through the composed `contentClient` — the same entry point application code
 * uses. That keeps the tests honest about the real call path.
 */
describe("Payload content client adapter", () => {
  it("passes overrideAccess: false to payload.find for list reads", async () => {
    const find = vi.fn().mockResolvedValue({ docs: [], totalDocs: 0 });
    vi.mocked(getPayloadClient).mockResolvedValue({ find } as never);

    await contentClient.getPages();

    expect(find).toHaveBeenCalledWith(expect.objectContaining({ overrideAccess: false }));
  });

  it("passes overrideAccess: false to payload.find for single-document reads", async () => {
    const find = vi.fn().mockResolvedValue({ docs: [], totalDocs: 0 });
    vi.mocked(getPayloadClient).mockResolvedValue({ find } as never);

    await contentClient.getPageBySlug("about");

    expect(find).toHaveBeenCalledWith(expect.objectContaining({ overrideAccess: false }));
  });

  it("forwards the published-only filter produced by web-core", async () => {
    const find = vi.fn().mockResolvedValue({ docs: [], totalDocs: 0 });
    vi.mocked(getPayloadClient).mockResolvedValue({ find } as never);

    await contentClient.getPages();

    const where = find.mock.calls[0]?.[0]?.where as Record<string, unknown>;
    expect(JSON.stringify(where)).toContain("published");
  });

  it("propagates query failures instead of reporting an empty result", async () => {
    const find = vi.fn().mockRejectedValue(new Error("connection refused"));
    vi.mocked(getPayloadClient).mockResolvedValue({ find } as never);

    await expect(contentClient.getPages()).rejects.toThrow("connection refused");
  });

  it("passes overrideAccess: true for an authorized draft read, so an anonymous preview request isn't re-filtered to published-only by the collection's own access rule", async () => {
    vi.stubEnv("PREVIEW_SECRET", "test-preview-secret-0123456789abcdefghij");
    const find = vi
      .fn()
      .mockResolvedValue({ docs: [{ id: "1", slug: "draft-page" }], totalDocs: 1 });
    vi.mocked(getPayloadClient).mockResolvedValue({ find } as never);

    // Regression test for a real bug found via E2E testing: `pages`' access
    // rule (`publishedOrAuthenticated`) restricts anonymous reads to
    // published documents regardless of the `draft` query flag, so
    // `overrideAccess: false` here made every anonymous preview request
    // 404 even with a correct `PREVIEW_SECRET`. `assertAuthorizedDraftAccess`
    // (in `@nero/web-core`) has already validated `previewToken` by the time
    // this adapter is called, so this path is not a new access hole.
    await contentClient.getPageBySlug("draft-page", {
      draft: true,
      previewToken: "test-preview-secret-0123456789abcdefghij",
    });

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ draft: true, overrideAccess: true }),
    );
    vi.unstubAllEnvs();
  });
});
