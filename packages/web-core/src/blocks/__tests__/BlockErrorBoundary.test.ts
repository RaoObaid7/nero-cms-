import { describe, expect, it, vi } from "vitest";
import { BlockErrorFallback } from "../BlockErrorBoundary";

/**
 * Unit-proves the logging contract of the fallback `catchError` renders on a
 * caught error: it logs with the block's context and renders nothing, so a
 * broken block disappears from the page instead of surfacing a raw error.
 *
 * This does not (and cannot, outside a real Next.js request) prove that
 * `catchError` actually recovers a Server Component's render-phase throw, or
 * that passing plain-data-only props avoids the RSC "functions cannot be
 * passed to Client Components" failure — both were verified directly against
 * a real `next build` + `next start` run instead (see `BlockErrorBoundary`'s
 * own doc comment, and the E2E suite's editor-publishes journey, which
 * renders an actual block through this exact path).
 */
describe("BlockErrorFallback", () => {
  it("logs the block's context and renders nothing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const result = BlockErrorFallback(
      { blockType: "hero", index: 2 },
      { error: new Error("boom"), reset: () => {}, retry: () => {} },
    );

    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("threw during render"),
      expect.objectContaining({ blockType: "hero", index: 2, error: "boom" }),
    );
    warn.mockRestore();
  });

  it("stringifies a non-Error thrown value instead of crashing the fallback itself", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    BlockErrorFallback(
      { blockType: "cta", index: 0 },
      { error: "not an Error instance", reset: () => {}, retry: () => {} },
    );

    expect(warn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ error: "not an Error instance" }),
    );
    warn.mockRestore();
  });
});
