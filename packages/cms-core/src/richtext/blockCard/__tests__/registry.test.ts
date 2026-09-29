import { describe, expect, it } from "vitest";
import { blockCatalog } from "../../../blocks";
import { BLOCK_CARD_COMPONENT, withBlockCards } from "../registry";

describe("withBlockCards", () => {
  it("gives every catalog block a card component, keyed by its own slug", () => {
    const cardBlocks = withBlockCards(blockCatalog);
    for (const block of cardBlocks) {
      expect(block.admin?.components?.Block).toBe(
        BLOCK_CARD_COMPONENT[block.slug as keyof typeof BLOCK_CARD_COMPONENT],
      );
    }
  });

  it("keeps the same slugs, count and field schemas as the input", () => {
    const cardBlocks = withBlockCards(blockCatalog);
    expect(cardBlocks.map((block) => block.slug)).toEqual(blockCatalog.map((block) => block.slug));
    expect(cardBlocks.map((block) => block.fields)).toEqual(blockCatalog.map((block) => block.fields));
  });

  it("never mutates the blocks it was given — `layout` renders these same objects", () => {
    const before = blockCatalog.map((block) => block.admin?.components?.Block);
    withBlockCards(blockCatalog);
    const after = blockCatalog.map((block) => block.admin?.components?.Block);
    expect(after).toEqual(before);
    expect(after.every((component) => component === undefined)).toBe(true);
  });
});
