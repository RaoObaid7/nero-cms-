import { test, expect } from "@playwright/test";
import { createPage, runScheduler, uniqueSuffix } from "./helpers";

/**
 * Journey 4: a document scheduled for the past ("due") stays a draft — and
 * so stays off every public route — until the scheduler actually runs.
 * The scheduler is invoked through the gated test API (which runs it inside
 * the actual server process — the same one `scripts/publish-scheduled.ts`
 * would run against in production) rather than waiting on a real timer,
 * which would make this test slow and flaky without proving anything more.
 */
test("a due scheduled page is hidden until the scheduler publishes it", async ({
  page,
  request,
  baseURL,
}) => {
  const slug = `e2e-scheduled-${uniqueSuffix()}`;
  const title = `E2E Scheduled Page ${uniqueSuffix()}`;
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();

  await createPage(
    request,
    baseURL!,
    { title, slug, _status: "draft", publishAt: oneMinuteAgo },
    true,
  );

  const beforeResponse = await page.goto(`/${slug}`);
  expect(beforeResponse?.status()).toBe(404);

  const results = await runScheduler(request, baseURL!);
  expect(results.some((r) => r.collection === "pages")).toBe(true);

  // The scheduler runs in the same server process here (via the test API —
  // see its doc comment), but `scripts/publish-scheduled.ts` normally runs
  // as a *separate* process in production, whose cache-tag invalidation
  // cannot reach this server's in-memory cache. The bounded
  // `CONTENT_CACHE_REVALIDATE_SECONDS` (set low for this test run — see
  // `playwright.config.ts`) is the safety net that still guarantees
  // propagation within a bounded time regardless of which process
  // published; wait it out here rather than relying on same-process luck.
  await page.waitForTimeout(2_500);

  const afterResponse = await page.goto(`/${slug}`);
  expect(afterResponse?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveText(title);
});

/**
 * The other half of journey 4, and the one the plan actually names: a
 * *future*-dated document. This exercises `enforceScheduledPublish`, which
 * forces `_status` back to draft even when the caller asks to publish — the
 * branch a past-dated fixture never reaches. Without it, an editor could
 * schedule a post for next week and have it go live immediately.
 */
test("a future-scheduled page cannot be published early, even when publication is requested", async ({
  page,
  request,
  baseURL,
}) => {
  const slug = `e2e-future-${uniqueSuffix()}`;
  const title = `E2E Future Scheduled ${uniqueSuffix()}`;
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Deliberately ask for `published`: the hook must override it.
  const doc = await createPage(request, baseURL!, {
    title,
    slug,
    _status: "published",
    publishAt: nextWeek,
  });

  expect(doc._status).toBe("draft");

  const response = await page.goto(`/${slug}`);
  expect(response?.status()).toBe(404);

  // Running the scheduler must not publish it either — it is not due yet.
  const results = await runScheduler(request, baseURL!);
  expect(results.some((r) => String(r.id) === String(doc.id))).toBe(false);

  const stillHidden = await page.goto(`/${slug}`);
  expect(stillHidden?.status()).toBe(404);

  // And it must not appear in the sitemap while it waits.
  const sitemap = await request.get(`${baseURL}/sitemap.xml`);
  expect(await sitemap.text()).not.toContain(slug);
});
