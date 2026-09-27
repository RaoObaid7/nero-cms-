import { test, expect } from "@playwright/test";
import { ensureAdminUser, loginAsAdmin, uniqueSuffix } from "./helpers";

/**
 * Journey 6b: the *published* stop condition — the higher-consequence half of
 * the rule in PRD §6 and the risk SPRINT-03A §7 names explicitly. Once a
 * document is live, its URL must never move because someone reworded the
 * title: that silently breaks inbound links and search results.
 *
 * Covered here rather than as a component test because the behavior depends on
 * Payload's form state (`_status`) reaching the field component. A mocked form
 * would prove the component's logic while missing exactly the integration that
 * could fail.
 */
test("slug stops following the title once the document is published", async ({
  page,
  request,
  baseURL,
}) => {
  await ensureAdminUser(request, baseURL!);
  await loginAsAdmin(page);

  const suffix = uniqueSuffix();
  await page.goto("/admin/collections/pages/create");
  await page.waitForSelector("#field-slug");

  // Auto-fill still active before publication.
  await page.fill("#field-title", `Published Lock ${suffix}`);
  const publishedSlug = await page.locator("#field-slug").inputValue();
  expect(publishedSlug).not.toBe("");

  await page.getByRole("button", { name: /^publish changes$/i }).click();
  // Wait for the save to land rather than for a button state: after publishing,
  // Payload disables "Publish changes" until the form is dirty again, so the
  // reliable signal is the document gaining an id in the URL.
  await page.waitForURL(/\/admin\/collections\/pages\/(?!create)[^/]+$/, { timeout: 20_000 });
  await expect(page.locator("#field-slug")).toHaveValue(publishedSlug);

  // The document is live at `publishedSlug`. Rewording the title must not move it.
  await page.fill("#field-title", `Completely Reworded Headline ${suffix}`);
  await expect(page.locator("#field-slug")).toHaveValue(publishedSlug);

  // And the stop condition must survive a reload of the published document.
  await page.reload();
  await page.waitForSelector("#field-slug");
  await page.fill("#field-title", `Reworded Again After Reload ${suffix}`);
  await expect(page.locator("#field-slug")).toHaveValue(publishedSlug);
});
