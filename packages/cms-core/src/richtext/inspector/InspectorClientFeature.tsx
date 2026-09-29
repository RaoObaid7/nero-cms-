"use client";

import { createClientFeature } from "@payloadcms/richtext-lexical/client";
import { InspectorProvider } from "./InspectorContext";
import { InspectorPanel } from "./InspectorPanel";

/**
 * The client half of `InspectorFeature` (`InspectorFeature.ts`), referenced
 * from there via the `"@nero/cms-core/client#InspectorClientFeature"`
 * import-map path — the same `ClientFeature` pattern
 * `@payloadcms/richtext-lexical` uses for its own built-in features.
 *
 * `providers` nests `InspectorProvider` below Payload's own
 * `EditorConfigProvider`, so every `BlockCard` inside this editor instance
 * can reach the shared inspector state via `useInspectorContext()`.
 * `plugins` mounts the panel itself once, alongside the editor content.
 */
export const InspectorClientFeature = createClientFeature({
  plugins: [
    {
      Component: InspectorPanel,
      position: "belowContainer",
    },
  ],
  providers: [InspectorProvider],
});
