import { describe, expect, it } from "vitest";
import type { CollectionConfig } from "payload";
import { withPreview } from "../preview";

describe("withPreview", () => {
  const baseCollection: CollectionConfig = {
    slug: "pages",
    admin: { useAsTitle: "title" },
    fields: [],
  };

  it("wires admin.preview to the supplied builder", () => {
    const wired = withPreview(baseCollection, "pages", ({ collectionSlug, doc }) => {
      return `https://example.test/preview?collection=${collectionSlug}&slug=${doc.slug}`;
    });

    const url = wired.admin?.preview?.(
      { slug: "about" },
      { locale: "en", req: {} as never, token: null },
    );
    expect(url).toBe("https://example.test/preview?collection=pages&slug=about");
  });

  it("wires admin.livePreview.url to the same builder", async () => {
    const wired = withPreview(
      baseCollection,
      "pages",
      ({ doc }) => `https://example.test/preview/${doc.slug}`,
    );

    const urlFn = wired.admin?.livePreview?.url;
    if (typeof urlFn !== "function") throw new Error("expected livePreview.url to be a function");

    const url = await urlFn({
      data: { slug: "about" },
      locale: "en" as never,
      payload: {} as never,
      req: {} as never,
    });
    expect(url).toBe("https://example.test/preview/about");
  });

  it("returns null instead of a URL when the builder opts out", () => {
    const wired = withPreview(baseCollection, "pages", () => undefined);
    const url = wired.admin?.preview?.(
      { slug: "about" },
      { locale: "en", req: {} as never, token: null },
    );
    expect(url).toBeNull();
  });

  it("preserves the rest of the collection's admin config", () => {
    const wired = withPreview(baseCollection, "pages", () => "https://example.test/preview");
    expect(wired.admin?.useAsTitle).toBe("title");
  });
});
