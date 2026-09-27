import type { APIRequestContext, Page } from "@playwright/test";

export const ADMIN_EMAIL = "e2e-admin@example.invalid";
export const ADMIN_PASSWORD = "e2e-admin-password-0123456789";

const E2E_SECRET = process.env.E2E_TEST_SECRET ?? "e2e-local-secret-not-for-production-0000";

/**
 * Calls the gated `/api/e2e` test-control endpoint (see its own doc comment
 * for why fixtures go through the running server instead of importing
 * `payload.config.ts` directly into the Playwright process).
 */
async function callTestApi(
  request: APIRequestContext,
  baseURL: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await request.post(`${baseURL}/api/e2e`, {
    headers: { "x-e2e-secret": E2E_SECRET, "content-type": "application/json" },
    data: JSON.stringify(body),
  });
  if (!response.ok()) {
    throw new Error(
      `E2E test API call ${JSON.stringify(body)} failed: ${response.status()} ${await response.text()}`,
    );
  }
  return response.json();
}

export async function ensureAdminUser(request: APIRequestContext, baseURL: string): Promise<void> {
  await callTestApi(request, baseURL, {
    action: "ensure-admin",
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
}

export async function createPage(
  request: APIRequestContext,
  baseURL: string,
  data: Record<string, unknown>,
  draft = false,
): Promise<Record<string, unknown>> {
  const result = await callTestApi(request, baseURL, { action: "create-page", data, draft });
  return result.doc as Record<string, unknown>;
}

export async function updatePage(
  request: APIRequestContext,
  baseURL: string,
  id: string | number,
  data: Record<string, unknown>,
  draft = false,
): Promise<Record<string, unknown>> {
  const result = await callTestApi(request, baseURL, { action: "update-page", id, data, draft });
  return result.doc as Record<string, unknown>;
}

export async function createRedirect(
  request: APIRequestContext,
  baseURL: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const result = await callTestApi(request, baseURL, { action: "create-redirect", data });
  return result.doc as Record<string, unknown>;
}

export interface ScheduledPublishResult {
  collection: string;
  id: string | number;
}

export async function runScheduler(
  request: APIRequestContext,
  baseURL: string,
): Promise<ScheduledPublishResult[]> {
  const result = await callTestApi(request, baseURL, { action: "run-scheduler" });
  return result.results as ScheduledPublishResult[];
}

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/admin/login");
  await page.fill("#field-email", ADMIN_EMAIL);
  await page.fill("#field-password", ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 15_000 }),
    page.getByRole("button", { name: "Login" }).click(),
  ]);
}

export async function createArticle(
  request: APIRequestContext,
  baseURL: string,
  data: Record<string, unknown>,
  draft = false,
): Promise<Record<string, unknown>> {
  const result = await callTestApi(request, baseURL, { action: "create-article", data, draft });
  return result.doc as Record<string, unknown>;
}

export async function createCategory(
  request: APIRequestContext,
  baseURL: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const result = await callTestApi(request, baseURL, { action: "create-category", data });
  return result.doc as Record<string, unknown>;
}

/** Keeps fixture slugs unique across repeated runs against the same database. */
export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
}
