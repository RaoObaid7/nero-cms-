import { unstable_cache } from "next/cache";

/** Overridable in tests so the E2E scheduled-content journey doesn't need to wait out a production-length window. */
const REVALIDATE_SECONDS = Number(process.env.CONTENT_CACHE_REVALIDATE_SECONDS ?? 60);

/**
 * Wraps a public content read in Next's data cache, tagged with
 * `@nero/web-core`'s cache-tag contract — the "consumer" half of acceptance
 * criterion 11. `invalidateCacheTags` (called from `cms-core`'s publish
 * lifecycle hooks, in the same process, e.g. an admin Publish click handled
 * by this same running server) is the "producer" half: it calls
 * `revalidateTag` with these same tag names, so the next request re-fetches
 * instead of serving stale content — effectively immediately, for changes
 * made through this server process.
 *
 * `revalidate: 60` is a bounded safety net on top of that, not the primary
 * mechanism: `revalidateTag` only invalidates the calling process's own
 * cache. A change made through a *different* process sharing this database
 * — the standalone scheduler script (`scripts/publish-scheduled.ts`), or
 * another replica in a multi-instance deployment — never reaches this
 * process's `revalidateTag` call, so without a ceiling this cache would
 * serve a stale "not found yet" result forever once cached. 60 seconds
 * matches PRD §8's publication-propagation target and bounds that gap;
 * genuinely solving cross-process/replica invalidation needs a shared cache
 * handler (Next's `cacheHandlers` config), which is out of scope here.
 */
export function cachedRead<T>(
  keyParts: string[],
  tags: string[],
  fn: () => Promise<T>,
): Promise<T> {
  return unstable_cache(fn, keyParts, { tags, revalidate: REVALIDATE_SECONDS })();
}
