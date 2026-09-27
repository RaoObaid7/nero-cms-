import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

/** Shared ESLint flat config consumed by every workspace package. */
export const baseConfig = tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/*.config.mjs",
      "**/*.config.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
);

/**
 * Architecture boundary enforcement via no-restricted-imports.
 * Pass a list of package patterns that must not be imported from a workspace.
 */
export function restrictedImportsConfig(patterns) {
  return tseslint.config({
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: patterns.map((p) => ({
            group: [p],
            message: `Architecture boundary: importing "${p}" is not allowed from this package.`,
          })),
        },
      ],
    },
  });
}

export const reactConfig = tseslint.config({
  plugins: {
    "react-hooks": reactHooks,
  },
  languageOptions: {
    globals: {
      ...globals.browser,
    },
  },
  rules: {
    ...reactHooks.configs.recommended.rules,
  },
});

export default baseConfig;
