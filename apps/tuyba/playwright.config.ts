import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * Runs against a real built app and real PostgreSQL, never a mocked server
 * (plan §2.5). `webServer` starts the already-built app with `next start`;
 * CI runs `pnpm build` as a separate step before `pnpm --filter @nero/tuyba
 * run e2e`, so this is genuinely the production build, not `next dev`.
 *
 * `workers: 1` and `fullyParallel: false`: every spec shares one Postgres
 * database and one running server. Parallel workers would race each other's
 * fixtures (e.g. the admin login session, or two specs both expecting to be
 * the only unpublished document in a listing).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : "html",
  timeout: 30_000,
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm run start",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      // Short cache-revalidation ceiling so the scheduled-content journey
      // (which changes data from a separate process — see `cached-content.ts`)
      // doesn't need to wait out the production-length window.
      CONTENT_CACHE_REVALIDATE_SECONDS: "2",
      // Enables the gated `/api/e2e` test-control endpoint (see its doc
      // comment). Never set outside this E2E run.
      E2E_TEST_MODE: "true",
      E2E_TEST_SECRET: process.env.E2E_TEST_SECRET ?? "e2e-local-secret-not-for-production-0000",
    },
  },
});
