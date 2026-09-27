import { test, expect } from "@playwright/test";
import { createPage, uniqueSuffix } from "./helpers";

/**
 * Journey 2: a draft is absent from its own public URL, from listings, and
 * from the sitemap. Seeded through the gated test API (plan §7's "seed
 * through the local API" guidance — see `helpers.ts` for why that's a
 * request to the running server rather than a direct Payload import here)
 * rather than clicking through the admin, since creating the draft isn't
 * itself what this journey is testing.
 */
test("a draft page 404s publicly and never appears in listings or the sitemap", async ({
  page,
  request,
  baseURL,
}) => {
  const slug = `e2e-draft-${uniqueSuffix()}`;
  const title = `E2E Draft Page ${uniqueSuffix()}`;

  await createPage(request, baseURL!, { title, slug, _status: "draft" }, true);

  const response = await page.goto(`/${slug}`);
  expect(response?.status()).toBe(404);

  await page.goto("/");
  await expect(page.getByText(title)).toHaveCount(0);

  const sitemapResponse = await page.goto("/sitemap.xml");
  expect(sitemapResponse?.status()).toBe(200);
  const sitemapBody = await sitemapResponse?.text();
  expect(sitemapBody).not.toContain(slug);
});
