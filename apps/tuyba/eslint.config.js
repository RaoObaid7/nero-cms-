import { baseConfig, reactConfig } from "@nero/tooling/eslint/base";

export default [
  ...baseConfig,
  ...reactConfig,
  {
    ignores: ["src/app/(payload)/admin/importMap.js"],
  },
  {
    rules: {
      // Payload route handlers re-export the same function names Next.js expects (GET, POST, ...).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];
