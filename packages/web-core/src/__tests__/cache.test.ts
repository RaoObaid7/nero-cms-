import { describe, expect, it } from "vitest";
import { cacheTagsForPage, collectionCacheTag, documentCacheTag } from "../cache";

describe("cache tag contract", () => {
  it("builds a stable collection tag scoped to a locale", () => {
    expect(collectionCacheTag("pages", "en")).toBe("nero-content:en:pages");
  });

  it("builds a stable document tag scoped to its collection and locale", () => {
    expect(documentCacheTag("pages", "about", "en")).toBe("nero-content:en:pages:about");
  });

  it("returns both the collection and document tag for a page in a locale", () => {
    expect(cacheTagsForPage("about", "en")).toEqual([
      "nero-content:en:pages",
      "nero-content:en:pages:about",
    ]);
  });

  it("keeps tags for different locales distinct", () => {
    expect(cacheTagsForPage("about", "en")).not.toEqual(cacheTagsForPage("about", "tr"));
  });
});
