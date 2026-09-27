import { test, expect } from "@playwright/test";
import { createPage, createRedirect, updatePage, uniqueSuffix } from "./helpers";

/**
 * Journey 7: SEO-109 redirect *serving*. Acceptance criterion 8 requires every
 * configured status to be proven, not just the hook that writes the rows —
 * a redirect that is stored but served as a 200 is worse than no redirect.
 *
 * Playwright follows redirects by default, so each case asserts on the
 * response chain rather than on `response.status()` alone.
 */
test.describe("redirect manager serves the configured status", () => {
  test("a renamed published page redirects its old URL to the new one", async ({
    page,
    request,
    baseURL,
  }) => {
    const suffix = uniqueSuffix();
    const originalSlug = `e2e-renamed-from-${suffix}`;
    const newSlug = `e2e-renamed-to-${suffix}`;
    const title = `E2E Renamed Page ${suffix}`;

    const doc = await createPage(request, baseURL!, {
      title,
      slug: originalSlug,
      _status: "published",
    });

    await updatePage(request, baseURL!, doc.id as string | number, {
      slug: newSlug,
      _status: "published",
    });

    const response = await page.goto(`/${originalSlug}`);
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe(`/${newSlug}`);
    await expect(page.locator("h1")).toHaveText(title);
  });

  test("302 and 307 redirect without being treated as permanent", async ({
    page,
    request,
    baseURL,
  }) => {
    const suffix = uniqueSuffix();
    const target = `e2e-redirect-target-${suffix}`;
    const title = `E2E Redirect Target ${suffix}`;
    await createPage(request, baseURL!, { title, slug: target, _status: "published" });

    for (const type of ["302", "307"] as const) {
      const from = `/e2e-temp-${type}-${suffix}`;
      await createRedirect(request, baseURL!, { from, to: `/${target}`, type });

      const response = await page.goto(from);
      expect(response?.status()).toBe(200);
      expect(new URL(page.url()).pathname).toBe(`/${target}`);

      const chain = response?.request().redirectedFrom();
      expect(chain, `${type} should have produced a redirect hop`).not.toBeNull();
      expect((await chain!.response())?.status()).toBe(Number(type));
    }
  });

  test("410 and 451 respond directly with no destination", async ({ request, baseURL }) => {
    const suffix = uniqueSuffix();

    for (const type of ["410", "451"] as const) {
      const from = `/e2e-gone-${type}-${suffix}`;
      await createRedirect(request, baseURL!, { from, type });

      const response = await request.get(`${baseURL}${from}`, { maxRedirects: 0 });
      expect(response.status()).toBe(Number(type));
    }
  });
});
