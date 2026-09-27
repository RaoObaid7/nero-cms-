import type { CollectionConfig } from "payload";

/** Collections the admin "Preview" button and live preview are wired up for. */
export const PREVIEWABLE_COLLECTIONS = ["pages", "articles"] as const;

export type PreviewableCollection = (typeof PREVIEWABLE_COLLECTIONS)[number];

/**
 * Builds the URL the admin UI opens for "Preview" / live preview, given the
 * collection slug and the in-progress document data. Returning `undefined`
 * disables preview for that document (e.g. no slug yet).
 *
 * Implemented by the consuming application, not `cms-core`: the target route
 * (`/preview`, its query shape, the frontend origin) is TUYBA-specific
 * plumbing, and the sprint plan requires that coupling to stay in
 * `apps/tuyba` rather than the shared package.
 */
export type PreviewUrlBuilder = (args: {
  collectionSlug: PreviewableCollection;
  doc: Record<string, unknown>;
}) => string | undefined;

/**
 * Wires a collection's `admin.preview` and `admin.livePreview.url` to the
 * given builder, without the collection itself knowing anything about the
 * frontend. Applied by `buildNeroConfig` when the consuming app supplies a
 * `previewUrl` option.
 */
export function withPreview(
  collection: CollectionConfig,
  collectionSlug: PreviewableCollection,
  previewUrl: PreviewUrlBuilder,
): CollectionConfig {
  return {
    ...collection,
    admin: {
      ...collection.admin,
      preview: (doc) => previewUrl({ collectionSlug, doc }) ?? null,
      livePreview: {
        ...collection.admin?.livePreview,
        url: ({ data }) => previewUrl({ collectionSlug, doc: data }) ?? null,
      },
    },
  };
}
