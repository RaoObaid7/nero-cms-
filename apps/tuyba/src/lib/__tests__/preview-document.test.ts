import { describe, expect, it, vi } from "vitest";

vi.mock("../content-client", () => ({
  contentClient: {
    getPageBySlug: vi.fn(),
    getArticleBySlug: vi.fn(),
  },
}));

const { contentClient } = await import("../content-client");
const { resolvePreviewDocument } = await import("../preview-document");

describe("resolvePreviewDocument", () => {
  it("returns null when collection is missing or unrecognized", async () => {
    expect(await resolvePreviewDocument({ slug: "about" })).toBeNull();
    expect(await resolvePreviewDocument({ collection: "users", slug: "about" })).toBeNull();
  });

  it("returns null when slug is missing", async () => {
    expect(await resolvePreviewDocument({ collection: "pages" })).toBeNull();
  });

  it("never calls the content client for bad params", async () => {
    await resolvePreviewDocument({ collection: "users", slug: "about" });
    expect(contentClient.getPageBySlug).not.toHaveBeenCalled();
  });

  it("returns draft content when the secret matches PREVIEW_SECRET", async () => {
    vi.mocked(contentClient.getPageBySlug).mockImplementation(async (_slug, options) => {
      if (options?.draft === true && options.previewToken === "correct-secret") {
        return { id: 1, slug: "about", title: "Draft About Page" } as never;
      }
      throw new Error("Draft reads require a valid previewToken.");
    });

    const result = await resolvePreviewDocument({
      collection: "pages",
      slug: "about",
      secret: "correct-secret",
    });

    expect(result?.doc.title).toBe("Draft About Page");
  });

  it("falls back to a published-only read when the secret is wrong", async () => {
    vi.mocked(contentClient.getPageBySlug).mockImplementation(async (_slug, options) => {
      if (options?.draft === true) {
        throw new Error("Draft reads require a valid previewToken.");
      }
      return { id: 1, slug: "about", title: "Published About Page" } as never;
    });

    const result = await resolvePreviewDocument({
      collection: "pages",
      slug: "about",
      secret: "wrong-secret",
    });

    expect(result?.doc.title).toBe("Published About Page");
  });

  it("falls back to a published-only read when no secret is supplied at all", async () => {
    vi.mocked(contentClient.getPageBySlug).mockImplementation(async (_slug, options) => {
      expect(options?.draft).not.toBe(true);
      return { id: 1, slug: "about", title: "Published About Page" } as never;
    });

    const result = await resolvePreviewDocument({ collection: "pages", slug: "about" });
    expect(result?.doc.title).toBe("Published About Page");
  });

  it("returns null when neither a draft nor a published document exists", async () => {
    vi.mocked(contentClient.getPageBySlug).mockResolvedValue(null);

    const result = await resolvePreviewDocument({ collection: "pages", slug: "missing" });
    expect(result).toBeNull();
  });

  it("supports the articles collection through the same contract", async () => {
    vi.mocked(contentClient.getArticleBySlug).mockResolvedValue({
      id: 2,
      slug: "first-article",
      title: "First Article",
    } as never);

    const result = await resolvePreviewDocument({ collection: "articles", slug: "first-article" });
    expect(result?.doc.title).toBe("First Article");
    expect(result?.collection).toBe("articles");
  });
});
