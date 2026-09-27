import { describe, expect, it } from "vitest";
import { BLOCK_SLUGS, blockCatalog, blockFixtures } from "../blocks";

describe("block catalog", () => {
  it("registers exactly the eight PRD section 6 blocks, each with a stable slug", () => {
    expect(BLOCK_SLUGS).toEqual([
      "hero",
      "richText",
      "imageText",
      "gallery",
      "callout",
      "contentCards",
      "faq",
      "cta",
    ]);
    expect(blockCatalog).toHaveLength(BLOCK_SLUGS.length);
    expect(blockCatalog.map((block) => block.slug)).toEqual(BLOCK_SLUGS);
  });

  it("has a unique slug per block", () => {
    const slugs = blockCatalog.map((block) => block.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("gives every registered block a meaningful editor label and description", () => {
    for (const block of blockCatalog) {
      expect(block.labels?.singular).toBeTruthy();
      expect(block.labels?.plural).toBeTruthy();
      expect(typeof block.custom?.description).toBe("string");
      expect((block.custom?.description as string).length).toBeGreaterThan(0);
    }
  });

  it("provides exactly one fixture per registered block, keyed by blockType", () => {
    const fixtureSlugs = Object.keys(blockFixtures).sort();
    const catalogSlugs = [...BLOCK_SLUGS].sort();
    expect(fixtureSlugs).toEqual(catalogSlugs);

    for (const slug of BLOCK_SLUGS) {
      expect(blockFixtures[slug].blockType).toBe(slug);
    }
  });

  it("never lets a block field admit a free-form heading level (H1 stays with templates)", () => {
    for (const block of blockCatalog) {
      const headingLevelField = block.fields.find(
        (field) => "name" in field && field.name === "headingLevel",
      );
      expect(headingLevelField).toBeUndefined();
    }
  });
});
