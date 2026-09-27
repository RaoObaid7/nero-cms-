/**
 * Cache-tag naming scheme for content invalidation, consumed by both a
 * writer (`@nero/cms-core`'s publish lifecycle hooks, calling
 * `revalidateTag`) and a reader (the app's cached content reads).
 *
 * Also published at the `@nero/web-core/cache` subpath, deliberately
 * separate from the package root: the root barrel re-exports `renderBlocks`,
 * which depends on `next/error`. That import works fine bundled through
 * Next.js, but breaks under Payload's own CLI tooling (`generate:types`,
 * migrations), which loads `payload.config.ts` — and therefore `cms-core`,
 * which needs these tag helpers — through a plain Node/ESM loader instead.
 * Importing `@nero/web-core/cache` avoids pulling that module graph in.
 */
export const CACHE_TAG_PREFIX = "nero-content";

/** Tag covering every document in a collection within one locale, e.g. a collection listing page. */
export function collectionCacheTag(collection: string, locale: string): string {
  return `${CACHE_TAG_PREFIX}:${locale}:${collection}`;
}

/** Tag covering a single document in one locale, addressed by its slug or id. */
export function documentCacheTag(collection: string, slugOrId: string, locale: string): string {
  return `${CACHE_TAG_PREFIX}:${locale}:${collection}:${slugOrId}`;
}

/** Tags a single page render should declare so both the listing and the document can invalidate it. */
export function cacheTagsForPage(slug: string, locale: string): string[] {
  return [collectionCacheTag("pages", locale), documentCacheTag("pages", slug, locale)];
}
