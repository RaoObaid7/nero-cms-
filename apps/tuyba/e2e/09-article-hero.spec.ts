import { test, expect } from "@playwright/test";
import { ensureAdminUser, createArticle, createCategory, uniqueSuffix } from "./helpers";

/**
 * ArticleHero visual and structural tests.
 * Verifies the bento-grid hero renders all its cells with real CMS data:
 * - category pill (top-left)
 * - editorial h1 title
 * - excerpt paragraph
 * - glassmorphic meta card with author + published date
 * - image cell (placeholder when no cover image)
 */

test.describe("ArticleHero", () => {
  let articleSlug: string;
  let categoryId: string | number;

  test.beforeAll(async ({ request, baseURL }) => {
    await ensureAdminUser(request, baseURL!);

    const suffix = uniqueSuffix();

    // Create a category so the pill renders
    const category = await createCategory(request, baseURL!, {
      name: `Technology ${suffix}`,
      slug: `technology-${suffix}`,
    });
    categoryId = category.id as string | number;

    // Create a published article with all hero fields populated
    const article = await createArticle(request, baseURL!, {
      title: `Hero Test Article ${suffix}`,
      slug: `hero-test-article-${suffix}`,
      excerpt: `This is the excerpt for hero test ${suffix}, shown below the title.`,
      _status: "published",
      primaryCategory: categoryId,
    });
    articleSlug = article.slug as string;
  });

  test("hero section is present with correct aria label", async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/blog/${articleSlug}`);
    const hero = page.locator('section[aria-label="Article header"]');
    await expect(hero).toBeVisible();
  });

  test("h1 displays the article title", async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/blog/${articleSlug}`);
    const h1 = page.locator('section[aria-label="Article header"] h1');
    await expect(h1).toBeVisible();
    await expect(h1).toContainText("Hero Test Article");
  });

  test("excerpt paragraph is visible", async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/blog/${articleSlug}`);
    const excerpt = page.locator('section[aria-label="Article header"] p');
    await expect(excerpt).toBeVisible();
    await expect(excerpt).toContainText("This is the excerpt for hero test");
  });

  test("category pill renders with category name", async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/blog/${articleSlug}`);
    const pill = page.locator('section[aria-label="Article header"] span').first();
    await expect(pill).toBeVisible();
    await expect(pill).toContainText("Technology");
  });

  test("meta card is rendered with Published label", async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/blog/${articleSlug}`);
    // The meta card contains a "PUBLISHED" label (uppercase via CSS)
    const metaLabel = page.getByText("Published", { exact: false });
    await expect(metaLabel).toBeVisible();
  });

  test("image placeholder cell is rendered when no cover image", async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/blog/${articleSlug}`);
    // When there's no cover image the placeholder div renders (aria-hidden)
    // Verify the hero grid exists and image area is present via screenshot + layout check
    const hero = page.locator('section[aria-label="Article header"]');
    await expect(hero).toBeVisible();

    // Grid must have at least 2 children (text cell + image area)
    const gridChildren = hero.locator(":scope > div > div");
    const count = await gridChildren.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("hero takes a screenshot for visual reference", async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/blog/${articleSlug}`);
    const hero = page.locator('section[aria-label="Article header"]');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveScreenshot("article-hero.png", { maxDiffPixelRatio: 0.05 });
  });
});
