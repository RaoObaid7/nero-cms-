import type { Payload } from "payload";

/** Collections whose `_status` the scheduler is allowed to flip. */
export const SCHEDULABLE_COLLECTIONS = ["pages", "articles"] as const;

export type SchedulableCollection = (typeof SCHEDULABLE_COLLECTIONS)[number];

export interface ScheduledPublishResult {
  collection: SchedulableCollection;
  id: string | number;
}

export interface PublishScheduledContentOptions {
  /** Overridable for tests; defaults to the real current time. */
  now?: Date;
  /** Bounds each collection's batch so one run cannot process an unbounded backlog. */
  limit?: number;
}

const DEFAULT_BATCH_LIMIT = 50;

/** A constant key so every process/replica contends for the same advisory lock. */
const SCHEDULER_LOCK_KEY = 726_310_004;

interface AdvisoryLockClient {
  query(sql: string, params?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
  release(): void;
}

interface AdvisoryLockPool {
  connect(): Promise<AdvisoryLockClient>;
}

/**
 * Best-effort Postgres advisory lock so two scheduler runs (e.g. two
 * replicas, or an overlapping cron tick) never process the same batch
 * concurrently — PRD 10.3 requires designing for the multi-replica case now.
 * Falls back to "no lock" if the adapter does not expose a raw pool (e.g. a
 * future non-Postgres adapter), since the operation is independently
 * idempotent and safe, just not lock-protected.
 *
 * The lock is acquired, held and released on ONE checked-out client.
 * `pg_try_advisory_lock` is session-scoped, so calling it through
 * `pool.query()` would take the lock on whichever connection the pool happens
 * to hand out and release it on a possibly different one — Postgres then warns
 * and returns false without throwing, leaving the original connection holding
 * the lock until its socket closes. Every later run would log "another run
 * holds the scheduler lock" and publish nothing, with no error to notice.
 */
async function withAdvisoryLock(
  payload: Payload,
  run: () => Promise<ScheduledPublishResult[]>,
): Promise<ScheduledPublishResult[]> {
  const pool = (payload.db as unknown as { pool?: AdvisoryLockPool }).pool;
  if (!pool?.connect) return run();

  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT pg_try_advisory_lock($1) AS locked", [
      SCHEDULER_LOCK_KEY,
    ]);
    const locked = rows[0]?.locked === true;
    if (!locked) {
      payload.logger.info(
        "publishScheduledContent: another run holds the scheduler lock, skipping",
      );
      return [];
    }

    try {
      return await run();
    } finally {
      // A false result means the lock was not held on this session — that
      // would indicate the bug this function exists to avoid, so surface it
      // rather than letting the scheduler wedge silently.
      const { rows: unlockRows } = await client.query("SELECT pg_advisory_unlock($1) AS unlocked", [
        SCHEDULER_LOCK_KEY,
      ]);
      if (unlockRows[0]?.unlocked !== true) {
        payload.logger.error(
          "publishScheduledContent: advisory unlock reported the lock was not held by this session",
        );
      }
    }
  } finally {
    client.release();
  }
}

/**
 * Publishes every due document: `_status: draft`, `publishAt` set and in the
 * past, across the schedulable collections. Idempotent — a document already
 * published no longer matches the query, so running this twice (including
 * concurrently, absent the advisory lock) has no additional effect. Bounded
 * by `limit` per collection per run rather than draining an unbounded queue.
 */
export async function publishScheduledContent(
  payload: Payload,
  options: PublishScheduledContentOptions = {},
): Promise<ScheduledPublishResult[]> {
  const now = options.now ?? new Date();
  const limit = options.limit ?? DEFAULT_BATCH_LIMIT;

  return withAdvisoryLock(payload, async () => {
    const results: ScheduledPublishResult[] = [];

    for (const collection of SCHEDULABLE_COLLECTIONS) {
      const due = (await payload.find({
        collection: collection as never,
        draft: true,
        overrideAccess: true,
        where: {
          and: [
            { _status: { equals: "draft" } },
            { publishAt: { less_than_equal: now.toISOString() } },
          ],
        },
        limit,
        sort: "publishAt",
      })) as { docs: Array<{ id: string | number }> };

      for (const doc of due.docs) {
        await payload.update({
          collection: collection as never,
          id: doc.id,
          overrideAccess: true,
          draft: false,
          data: { _status: "published" } as never,
          context: { allowScheduledPublish: true },
        });
        results.push({ collection, id: doc.id });
      }
    }

    return results;
  });
}
