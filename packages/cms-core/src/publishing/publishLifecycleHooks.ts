import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from "payload";
import { collectionCacheTag, documentCacheTag } from "@nero/web-core/cache";

export interface PublishLifecycleOptions {
  /** The collection this hook pair is attached to, e.g. `pages` or `articles`. */
  collectionSlug: string;
  /** Defaults to `en`. Must match the locale the public routes read with. */
  locale?: string;
  /**
   * Builds the public path for a document's slug in this collection (e.g.
   * `(slug) => `/${slug}`` for pages, `(slug) => `/blog/${slug}`` for
   * articles). Omit to skip automatic slug-change redirects — the URL shape
   * is an application concern, not something `cms-core` should assume.
   */
  pathFor?: (slug: string) => string;
  /** Called with every cache tag to invalidate for a change. Omit to skip cache invalidation. */
  invalidate?: (tags: string[]) => void | Promise<void>;
}

async function findRedirectByFrom(
  req: PayloadRequest,
  from: string,
): Promise<{ id: string | number; to?: string | null } | undefined> {
  const result = await req.payload.find({
    collection: "redirects",
    where: { from: { equals: from } },
    limit: 1,
    overrideAccess: true,
  });
  return result.docs[0] as { id: string | number; to?: string | null } | undefined;
}

/** Creates or repoints a 301 from `from` to `to`. Never overwrites a redirect an editor set to 410/451. */
async function upsertRedirect(req: PayloadRequest, from: string, to: string): Promise<void> {
  const existing = await findRedirectByFrom(req, from);
  if (existing) {
    if (existing.to !== to) {
      await req.payload.update({
        collection: "redirects",
        id: existing.id,
        data: { to, type: "301" },
        overrideAccess: true,
      });
    }
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (req.payload.create as any)({
    collection: "redirects",
    data: { from, to, type: "301" },
    overrideAccess: true,
  });
}

/** Removes a stale redirect shadowing a path that is live again (e.g. a slug reused after being renamed away and back). */
async function removeRedirectIfPresent(req: PayloadRequest, from: string): Promise<void> {
  const existing = await findRedirectByFrom(req, from);
  if (existing) {
    await req.payload.delete({ collection: "redirects", id: existing.id, overrideAccess: true });
  }
}

/**
 * Builds simple `afterChange`/`afterDelete` hooks for unversioned, always-public
 * taxonomy collections (`categories`, `tags`). These collections carry no
 * draft state, so the full publish lifecycle is unnecessary — we only need to
 * invalidate the collection-level cache tag so downstream listing pages rebuild.
 */
export function createTaxonomyCacheHooks(
  collectionSlug: string,
  locale: string,
  invalidate: (tags: string[]) => void | Promise<void>,
): { afterChange: CollectionAfterChangeHook; afterDelete: CollectionAfterDeleteHook } {
  const tag = collectionCacheTag(collectionSlug, locale);

  const afterChange: CollectionAfterChangeHook = async ({ doc }) => {
    await invalidate([tag]);
    return doc;
  };

  const afterDelete: CollectionAfterDeleteHook = async ({ doc }) => {
    await invalidate([tag]);
    return doc;
  };

  return { afterChange, afterDelete };
}

/**
 * Builds the `afterChange`/`afterDelete` hook pair implementing acceptance
 * criterion 11 (cache-tag invalidation) and part of SEO-109 (automatic
 * slug-change redirects) for one schedulable collection. Wired in via
 * `buildNeroConfig`'s `cacheAndRedirects` option so the URL shape and the
 * actual `revalidateTag` call stay in the consuming app.
 */
export function createPublishLifecycleHooks(options: PublishLifecycleOptions): {
  afterChange: CollectionAfterChangeHook;
  afterDelete: CollectionAfterDeleteHook;
} {
  const { collectionSlug, locale = "en", pathFor, invalidate } = options;

  const afterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
    const tags = new Set<string>([collectionCacheTag(collectionSlug, locale)]);
    const newSlug = typeof doc?.slug === "string" ? doc.slug : undefined;
    if (newSlug) tags.add(documentCacheTag(collectionSlug, newSlug, locale));

    const previousSlug = typeof previousDoc?.slug === "string" ? previousDoc.slug : undefined;
    const slugChanged =
      operation === "update" &&
      previousSlug !== undefined &&
      newSlug !== undefined &&
      previousSlug !== newSlug;

    if (slugChanged) {
      tags.add(documentCacheTag(collectionSlug, previousSlug, locale));
    }

    // A redirect row is publicly readable, so writing one for a document that
    // has never been published would disclose the slugs of unpublished work —
    // both the old and the new path — to anyone reading the redirects API.
    // Only a document that is (or was) publicly reachable can have a URL worth
    // redirecting, so gate every redirect write on publication status.
    const isPublished = doc?._status === "published";
    const wasPublished = previousDoc?._status === "published";
    const everPublished = isPublished || wasPublished;

    if (pathFor) {
      try {
        if (slugChanged && everPublished) {
          const fromPath = pathFor(previousSlug);
          const toPath = pathFor(newSlug);
          if (fromPath !== toPath) await upsertRedirect(req, fromPath, toPath);
        }
        if (newSlug && isPublished) {
          // A slug that is live again must not stay shadowed by a stale redirect from an earlier rename.
          await removeRedirectIfPresent(req, pathFor(newSlug));
        }
      } catch (error) {
        req.payload.logger.error(
          `createPublishLifecycleHooks(${collectionSlug}): failed to update redirects — ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    if (invalidate) await invalidate([...tags]);
    return doc;
  };

  const afterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
    const tags = [collectionCacheTag(collectionSlug, locale)];
    const slug = typeof doc?.slug === "string" ? doc.slug : undefined;
    if (slug) {
      tags.push(documentCacheTag(collectionSlug, slug, locale));
      if (pathFor) {
        try {
          await removeRedirectIfPresent(req, pathFor(slug));
        } catch (error) {
          req.payload.logger.error(
            `createPublishLifecycleHooks(${collectionSlug}): failed to clean up redirect on delete — ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    }
    if (invalidate) await invalidate(tags);
    return doc;
  };

  return { afterChange, afterDelete };
}
