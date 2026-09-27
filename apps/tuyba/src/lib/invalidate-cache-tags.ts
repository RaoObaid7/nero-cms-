import { revalidateTag } from "next/cache";

/**
 * Acceptance criterion 11's cache-tag consumer side: wired into
 * `buildNeroConfig`'s `cacheAndRedirects.invalidate` option, so publishing,
 * updating, deleting or slug-changing a page/article calls this with the
 * exact tags `@nero/web-core`'s cache-tag contract defines for that change.
 *
 * `{ expire: 0 }` means the tagged content is gone immediately on the next
 * request (no stale-while-revalidate window) — appropriate for editorial
 * publish actions, where a stale page after a click is a defect, not a
 * performance trade-off.
 *
 * `revalidateTag` only works inside a live Next.js server request. The
 * standalone scheduler script (`scripts/publish-scheduled.ts`) shares this
 * same Payload config but runs outside Next entirely, so calling it there
 * would throw; caught and logged rather than crashing the scheduler run —
 * the next real page request still serves fresh data once cached reads pick
 * up the change through their own `revalidate`/tag lifecycle.
 */
export function invalidateCacheTags(tags: string[]): void {
  for (const tag of tags) {
    try {
      revalidateTag(tag, { expire: 0 });
    } catch (error) {
      console.warn(
        `invalidateCacheTags: could not revalidate "${tag}" (expected outside a Next.js server request, e.g. the standalone scheduler script)`,
        error instanceof Error ? error.message : error,
      );
    }
  }
}
