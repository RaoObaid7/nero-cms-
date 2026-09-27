import { test, expect } from "@playwright/test";
import { ensureAdminUser, loginAsAdmin, uniqueSuffix } from "./helpers";

/**
 * Journey 1 (plan §2.5) and journey 6 (slug auto-fill, verified inline
 * here): an editor creates a page in the admin, watches the slug fill in
 * live as they type the title, adds a block, publishes — then an anonymous
 * visitor, in a completely separate browser context (no admin session,
 * no cookies), sees the published content at its public URL.
 */
test("editor publishes a page and an anonymous visitor sees it, with the slug auto-filled", async ({
  page,
  browser,
  request,
  baseURL,
}) => {
  await ensureAdminUser(request, baseURL!);
  await loginAsAdmin(page);

  const title = `E2E Published Page ${uniqueSuffix()}`;

  await page.goto("/admin/collections/pages/create");
  await page.waitForSelector("#field-slug");

  // Slug auto-fill (SPRINT-03A §2.2 / PRD §6): typing the title fills the
  // slug live, before anything is saved.
  await page.fill("#field-title", title);
  await expect(page.locator("#field-slug")).not.toHaveValue("");
  const slug = await page.inputValue("#field-slug");
  expect(slug).toMatch(/^[a-z0-9-]+$/);
  expect(slug).toContain("e2e-published-page");

  await page.locator(".blocks-field__drawer-toggler").click();
  await page.locator('button[title="Hero"]').click();
  await page.fill("#field-layout__0__heading", "Welcome, visitor");

  const [saveResponse] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/api/pages") && res.request().method() === "POST",
    ),
    page.locator("#action-save").click(),
  ]);
  expect(saveResponse.ok()).toBe(true);

  // Anonymous visitor: a fresh browser context, no admin session/cookies.
  const visitorContext = await browser.newContext({ baseURL });
  const visitorPage = await visitorContext.newPage();
  const response = await visitorPage.goto(`/${slug}`);
  expect(response?.status()).toBe(200);
  await expect(visitorPage.locator("h1")).toHaveText(title);
  await expect(visitorPage.getByText("Welcome, visitor")).toBeVisible();
  await visitorContext.close();
});
