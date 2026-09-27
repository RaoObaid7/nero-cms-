import type { CollectionConfig } from "payload";
import { isAdmin } from "../access";

/** Maximum user agent string length stored to bound column size. */
const MAX_UA_LENGTH = 200;

/**
 * SEO-111: Basic 404 monitoring.
 *
 * Stores sanitized 404 events for editorial review and aggregation.
 * Sensitive fields (query string, user input) are stripped before
 * storage; the `path` column is indexed for aggregate queries.
 *
 * Retention: `cleanupNotFoundEvents` deletes records older than 90 days.
 * Wire it to a cron job; it is not wired to an in-process timer here.
 *
 * Access: admin only — 404 paths could reveal site structure.
 */
export const NotFoundEvents: CollectionConfig = {
  slug: "not-found-events",
  admin: {
    useAsTitle: "path",
    defaultColumns: ["path", "count", "createdAt"],
    description:
      "SEO-111: 404 events logged for monitoring. Query strings are stripped before storage.",
    group: "SEO",
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: "path",
      type: "text",
      required: true,
      index: true,
      admin: { description: "Sanitized URL path (query string stripped)." },
    },
    {
      name: "referrer",
      type: "text",
      admin: { description: "Referring URL, if provided. Query string stripped." },
    },
    {
      name: "userAgent",
      type: "text",
      maxLength: MAX_UA_LENGTH,
      admin: { description: `First ${MAX_UA_LENGTH} characters of the User-Agent header.` },
    },
    {
      name: "count",
      type: "number",
      defaultValue: 1,
      admin: { description: "How many times this path was requested and not found." },
    },
  ],
  timestamps: true,
};

/**
 * Sanitizes a URL by stripping the query string and fragment identifier.
 * Bound cardinality and prevents sensitive search terms from entering the log.
 */
export function sanitizePath(raw: string): string {
  try {
    const url = new URL(raw, "http://localhost");
    return url.pathname;
  } catch {
    const idx = raw.indexOf("?");
    return idx === -1 ? raw : raw.slice(0, idx);
  }
}

/**
 * SEO-111: deletes `not-found-events` records older than `retentionDays`
 * (default: 90). Designed to be called from a scheduled job.
 */
export interface CleanupPayload {
  find(args: Record<string, unknown>): Promise<{ docs: Array<{ id: unknown }> }>;
  delete(args: Record<string, unknown>): Promise<unknown>;
  logger: { info(msg: string): void };
}

export async function cleanupNotFoundEvents(
  payload: CleanupPayload,
  retentionDays = 90,
): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const result = await payload.find({
    collection: "not-found-events",
    where: { createdAt: { less_than: cutoff } },
    limit: 1000,
    overrideAccess: true,
  });

  let deleted = 0;
  for (const doc of result.docs) {
    await payload.delete({
      collection: "not-found-events",
      id: doc.id,
      overrideAccess: true,
    });
    deleted++;
  }

  payload.logger.info(
    `cleanupNotFoundEvents: removed ${deleted} record(s) older than ${retentionDays} days.`,
  );
  return deleted;
}
