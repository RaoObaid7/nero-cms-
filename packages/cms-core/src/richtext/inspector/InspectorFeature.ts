import { createServerFeature } from "@payloadcms/richtext-lexical";

/**
 * Adds the block settings inspector (`InspectorPanel.tsx` + the shared
 * selection state in `InspectorContext.tsx`) to a body/content editor.
 * Built with Payload's own `createServerFeature`/`createClientFeature`
 * pair — the same public extension point `@payloadcms/richtext-lexical`
 * uses for its own bundled features — rather than any admin override, per
 * SPRINT-03A's "no custom admin" constraint.
 *
 * A plain feature with no nodes, formats or markdown transformers of its
 * own: it only contributes UI (a provider and a panel plugin) around the
 * blocks that `BlocksFeature` already renders.
 */
export const InspectorFeature = createServerFeature({
  key: "nero-inspector",
  feature: {
    ClientFeature: "@nero/cms-core/client#InspectorClientFeature",
  },
});
