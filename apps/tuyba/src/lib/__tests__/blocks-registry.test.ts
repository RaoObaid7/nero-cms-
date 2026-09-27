import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BLOCK_SLUGS, blockFixtures } from "@nero/cms-core";
import { renderBlocks } from "@nero/web-core";
import { blocksRegistry } from "../blocks-registry";

describe("blocksRegistry", () => {
  it("registers a renderer for every catalog block slug", () => {
    expect(Object.keys(blocksRegistry).sort()).toEqual([...BLOCK_SLUGS].sort());
  });

  it("renders every block's fixture without throwing, producing non-empty markup", () => {
    for (const slug of BLOCK_SLUGS) {
      const fixture = blockFixtures[slug];
      const [node] = renderBlocks([fixture as never], blocksRegistry);
      expect(node, `expected a rendered node for block "${slug}"`).toBeDefined();
      const html = renderToStaticMarkup(node);
      expect(html.length, `expected non-empty markup for block "${slug}"`).toBeGreaterThan(0);
    }
  });

  it("skips an unregistered block type through renderBlocks instead of throwing", () => {
    const warnings: unknown[] = [];
    const result = renderBlocks([{ blockType: "notInAnyCatalog" } as never], blocksRegistry, {
      logger: { warn: (message, context) => warnings.push({ message, context }) },
    });

    expect(result).toEqual([]);
    expect(warnings).toHaveLength(1);
  });
});
