import { PassThrough } from "node:stream";
import type { ReactNode } from "react";
import { renderToPipeableStream } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { renderBlocks } from "../blocks/renderBlocks";
import type { BlockData, BlockRegistry } from "../blocks/types";

/** Every returned node is wrapped in the `catchError` boundary; render it to compare visible output. */
function renderToHtml(node: ReactNode): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = renderToPipeableStream(node, {
      onShellReady() {
        const writable = new PassThrough();
        const chunks: Buffer[] = [];
        writable.on("data", (chunk: Buffer) => chunks.push(chunk));
        writable.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        stream.pipe(writable);
      },
      onShellError(error) {
        reject(error);
      },
      onError(error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    });
  });
}

async function renderAll(nodes: ReturnType<typeof renderBlocks>): Promise<string[]> {
  return Promise.all(nodes.map((node) => renderToHtml(node)));
}

describe("renderBlocks", () => {
  it("renders each block through its registered renderer, in order", async () => {
    const registry: BlockRegistry = {
      hero: (data) => `hero:${String(data.heading)}`,
      cta: (data) => `cta:${String(data.heading)}`,
    };
    const blocks: BlockData[] = [
      { blockType: "hero", heading: "Welcome" },
      { blockType: "cta", heading: "Act now" },
    ];

    await expect(renderAll(renderBlocks(blocks, registry))).resolves.toEqual([
      "hero:Welcome",
      "cta:Act now",
    ]);
  });

  it("wraps each block in the render-phase error boundary without altering non-erroring output", async () => {
    // Proves the boundary wrapping is transparent on the happy path. The
    // boundary's actual recovery of a render-phase throw is proven in
    // `blocks/__tests__/BlockErrorBoundary.test.ts` (the fallback's logging
    // contract) and against the real app in the E2E suite — see that file's
    // header comment for why a plain-Node SSR repro cannot prove recovery.
    const registry: BlockRegistry = { hero: (data) => `hero:${String(data.heading)}` };
    const blocks: BlockData[] = [{ blockType: "hero", heading: "Still here" }];

    const result = renderBlocks(blocks, registry);

    await expect(renderAll(result)).resolves.toEqual(["hero:Still here"]);
  });

  it("skips an unregistered block type and logs a warning, instead of throwing", async () => {
    const warn = vi.fn();
    const registry: BlockRegistry = { hero: (data) => `hero:${String(data.heading)}` };
    const blocks: BlockData[] = [
      { blockType: "hero", heading: "Welcome" },
      { blockType: "notInCatalog", anything: true },
    ];

    const result = renderBlocks(blocks, registry, { logger: { warn } });

    await expect(renderAll(result)).resolves.toEqual(["hero:Welcome"]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("unregistered block type"),
      expect.objectContaining({ blockType: "notInCatalog", index: 1 }),
    );
  });

  it("skips a block whose renderer throws, and logs a warning instead of propagating the error", () => {
    const warn = vi.fn();
    const registry: BlockRegistry = {
      broken: () => {
        throw new Error("malformed block data");
      },
    };
    const blocks: BlockData[] = [{ blockType: "broken" }];

    expect(() => renderBlocks(blocks, registry, { logger: { warn } })).not.toThrow();
    expect(renderBlocks(blocks, registry, { logger: { warn } })).toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("failed to render"),
      expect.objectContaining({ blockType: "broken", error: "malformed block data" }),
    );
  });

  it("returns an empty array for null/undefined/empty layout data", () => {
    const registry: BlockRegistry = {};
    expect(renderBlocks(null, registry)).toEqual([]);
    expect(renderBlocks(undefined, registry)).toEqual([]);
    expect(renderBlocks([], registry)).toEqual([]);
  });

  it("uses console.warn by default when no logger is supplied", () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const blocks: BlockData[] = [{ blockType: "unknown" }];

    renderBlocks(blocks, {});

    expect(consoleWarn).toHaveBeenCalled();
    consoleWarn.mockRestore();
  });
});
