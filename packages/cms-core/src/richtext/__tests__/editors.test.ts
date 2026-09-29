import { describe, expect, it } from "vitest";
import type { Block } from "payload";
import { __testing } from "../editors";

const { bodyEditorFeatures, inlineTextEditorFeatures } = __testing;

// A minimal stand-in for richtext-lexical's `defaultFeatures`: enough for
// these tests, which only care about feature `key`s, not full behavior.
const fakeDefaultFeatures = [{ key: "bold" }, { key: "italic" }] as never;

const fakeBlocks: Block[] = [{ slug: "fake", fields: [] }];

describe("buildBodyEditor's feature list", () => {
  it("includes BlocksFeature (key 'blocks'), so it can insert blocks inline", () => {
    const features = bodyEditorFeatures(fakeDefaultFeatures, fakeBlocks);
    expect(features.some((feature) => feature.key === "blocks")).toBe(true);
  });

  it("keeps every feature from defaultFeatures", () => {
    const features = bodyEditorFeatures(fakeDefaultFeatures, fakeBlocks);
    for (const defaultFeature of fakeDefaultFeatures as { key: string }[]) {
      expect(features.some((feature) => feature.key === defaultFeature.key)).toBe(true);
    }
  });
});

describe("buildInlineTextEditor's feature list", () => {
  it("never includes BlocksFeature (key 'blocks') — PRD section 6's nesting cap", () => {
    const features = inlineTextEditorFeatures(fakeDefaultFeatures);
    expect(features.some((feature) => feature.key === "blocks")).toBe(false);
  });

  it("keeps every feature from defaultFeatures", () => {
    const features = inlineTextEditorFeatures(fakeDefaultFeatures);
    for (const defaultFeature of fakeDefaultFeatures as { key: string }[]) {
      expect(features.some((feature) => feature.key === defaultFeature.key)).toBe(true);
    }
  });
});
