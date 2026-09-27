import { baseConfig, reactConfig, restrictedImportsConfig } from "@nero/tooling/eslint/base";

export default [
  ...baseConfig,
  ...reactConfig,
  ...restrictedImportsConfig(["@nero/cms-core", "@nero/web-core", "payload", "payload/*"]),
];
