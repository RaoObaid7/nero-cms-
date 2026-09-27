import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";
import { nodeTestConfig } from "@nero/tooling/vitest/node";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Mirrors tsconfig.json's `paths` mapping. Next's own bundler resolves these
// natively; Vitest needs them spelled out so tests (in particular the
// DB-backed integration tests, which need the real `@payload-config`) can
// import the same modules the app does.
export default mergeConfig(
  nodeTestConfig,
  defineConfig({
    resolve: {
      alias: {
        "@payload-config": path.resolve(dirname, "src/payload.config.ts"),
        "@": path.resolve(dirname, "src"),
      },
    },
    test: {
      // The DB-backed integration tests share one PostgreSQL database and each
      // boots its own Payload instance. Running their files in parallel races
      // on schema push and on the documents each test creates, so they fail
      // together while passing individually. Serialize test files; the suite is
      // small enough that the wall-clock cost is negligible.
      fileParallelism: false,
      // Vitest's 5s default is not enough for the DB-backed tests on a *fresh*
      // database: the first Payload boot pushes the whole schema before the
      // test body starts. Passing against an already-migrated database while
      // failing on a clean one is exactly the flake that hides real breakage.
      testTimeout: 30_000,
      hookTimeout: 30_000,
    },
  }),
);
