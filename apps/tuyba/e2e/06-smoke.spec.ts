import { test, expect } from "@playwright/test";

/** Journey 5: the public smoke routes respond and render without console errors. */
test.describe("smoke", () => {
  const routes = ["/", "/blog", "/admin", "/sitemap.xml"];

  for (const route of routes) {
    test(`${route} responds 200 and renders without console errors`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));

      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await page.waitForLoadState("networkidle");

      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });
  }
});
