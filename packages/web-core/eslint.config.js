import { baseConfig, restrictedImportsConfig } from "@nero/tooling/eslint/base";

export default [
  ...baseConfig,
  ...restrictedImportsConfig(["payload", "payload/*", "@payloadcms/*"]),
];
