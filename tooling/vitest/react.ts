import { defineConfig, mergeConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { nodeTestConfig } from "./node.ts";

export const reactTestConfig = mergeConfig(
  nodeTestConfig,
  defineConfig({
    plugins: [react()],
    test: {
      environment: "jsdom",
      include: ["src/**/*.test.tsx", "src/**/*.test.ts"],
      setupFiles: ["./vitest.setup.ts"],
    },
  }),
);
