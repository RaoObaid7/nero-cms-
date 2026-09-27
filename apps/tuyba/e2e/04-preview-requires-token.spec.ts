import { test, expect } from "@playwright/test";
import { createPage, uniqueSuffix } from "./helpers";

/**
 * Journey 3: `/preview` renders draft content only with a valid
 * `PREVIEW_SECRET`. Missing or wrong tokens fall back to the published-only
 * read (`resolvePreviewDocument`), which finds nothing for a draft-only
 * document and 404s — never leaking the draft.
 */
test.describe("preview requires a valid token", () => {
  const previewSecret = process.env.PREVIEW_SECRET;
  test.skip(!previewSecret, "PREVIEW_SECRET must be set for this journey to run");

  test("valid token shows the draft; missing or wrong token does not", async ({
    page,
    request,
    baseURL,
  }) => {
    const slug = `e2e-preview-${uniqueSuffix()}`;
    const title = `E2E Preview Draft ${uniqueSuffix()}`;

    await createPage(request, baseURL!, { title, slug, _status: "draft" }, true);

    const validUrl = `/preview?collection=pages&slug=${slug}&secret=${previewSecret}`;
    await page.goto(validUrl);
    await expect(page.getByText(title)).toBeVisible();

    const noTokenResponse = await page.goto(`/preview?collection=pages&slug=${slug}`);
    expect(noTokenResponse?.status()).toBe(404);

    const wrongTokenResponse = await page.goto(
      `/preview?collection=pages&slug=${slug}&secret=not-the-right-secret-at-all`,
    );
    expect(wrongTokenResponse?.status()).toBe(404);
  });
});
