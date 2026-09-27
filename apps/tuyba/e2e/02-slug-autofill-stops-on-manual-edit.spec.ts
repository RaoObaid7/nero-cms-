import { test, expect } from "@playwright/test";
import { ensureAdminUser, loginAsAdmin, uniqueSuffix } from "./helpers";

/**
 * Journey 6: the slug auto-sync stop condition. PRD §6 calls this out
 * explicitly — a slug that keeps following the title after the editor has
 * deliberately diverged it would silently break a URL the editor just set.
 */
test("slug stops following the title once the editor edits it directly", async ({
  page,
  request,
  baseURL,
}) => {
  await ensureAdminUser(request, baseURL!);
  await loginAsAdmin(page);

  const suffix = uniqueSuffix();
  await page.goto("/admin/collections/pages/create");
  await page.waitForSelector("#field-slug");

  await page.fill("#field-title", `First Title ${suffix}`);
  await expect(page.locator("#field-slug")).not.toHaveValue("");

  const customSlug = `custom-slug-${suffix}`;
  await page.fill("#field-slug", customSlug);

  // Further title edits must not overwrite the manually-set slug.
  await page.fill("#field-title", `Second Title Entirely Different ${suffix}`);
  await expect(page.locator("#field-slug")).toHaveValue(customSlug);
});
