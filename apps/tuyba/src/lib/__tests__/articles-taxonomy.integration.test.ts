import { describe, expect, it } from "vitest";

/**
 * Acceptance criterion 3 (SPRINT-02 §5): Articles, Categories and Tags exist
 * with the Sprint 1 draft/publish access model, exercised against a real
 * PostgreSQL database — not a mock. Requires `docker compose up -d` and
 * `DATABASE_URI` set; skipped otherwise so `pnpm test` stays DB-free by
 * default (see README / CI, which provides both).
 */
describe.skipIf(!process.env.DATABASE_URI)(
  "Articles/Categories/Tags (requires DATABASE_URI)",
  () => {
    it("creates a category, a tag and an article wired to both, and enforces published-only reads", async () => {
      const { getPayload } = await import("payload");
      const configModule = await import("../../payload.config");
      const { contentClient } = await import("../content-client");
      const payload = await getPayload({ config: configModule.default });

      const unique = Date.now().toString(36);

      const category = await payload.create({
        collection: "categories",
        data: { name: `Travel ${unique}`, slug: `travel-${unique}` },
        overrideAccess: true,
      });
      const tag = await payload.create({
        collection: "tags",
        data: { name: `Hajj ${unique}`, slug: `hajj-${unique}` },
        overrideAccess: true,
      });

      const slug = `sprint2-article-${unique}`;
      const article = await payload.create({
        collection: "articles",
        data: {
          title: "Sprint 2 integration article",
          slug,
          excerpt: "Draft excerpt",
          primaryCategory: category.id,
          additionalCategories: [category.id],
          tags: [tag.id],
          _status: "draft",
        },
        overrideAccess: true,
      });

      try {
        // Draft: must not be visible through the public, published-only seam.
        const publicRead = await contentClient.getArticleBySlug(slug);
        expect(publicRead).toBeNull();

        // Publish it, then it must become visible through the same seam.
        await payload.update({
          collection: "articles",
          id: article.id,
          data: { _status: "published" },
          overrideAccess: true,
        });

        const publishedRead = await contentClient.getArticleBySlug(slug);
        expect(publishedRead?.slug).toBe(slug);
        expect(publishedRead?.primaryCategory).toBeTruthy();
        expect(publishedRead?.tags).toBeTruthy();
      } finally {
        await payload.delete({ collection: "articles", id: article.id, overrideAccess: true });
        await payload.delete({ collection: "tags", id: tag.id, overrideAccess: true });
        await payload.delete({ collection: "categories", id: category.id, overrideAccess: true });
      }
    });
  },
);
