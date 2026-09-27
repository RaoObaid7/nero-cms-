import { defineConfig } from "vitest/config";

export const nodeTestConfig = defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: false,
  },
});
