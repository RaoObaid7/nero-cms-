import { describe, expect, it, vi } from "vitest";
import { publishScheduledContent } from "../publishing/scheduledPublish";

/**
 * The advisory lock must be taken, held and released on ONE pooled client.
 * `pg_try_advisory_lock` is session-scoped: taking it on one connection and
 * releasing it on another leaves the lock held until that connection closes,
 * which wedges every later scheduler run. These tests pin that contract.
 */
function createPool(options: { locked?: boolean; unlocked?: boolean } = {}) {
  const { locked = true, unlocked = true } = options;
  const query = vi.fn(async (sql: string) => {
    if (sql.includes("pg_try_advisory_lock")) return { rows: [{ locked }] };
    if (sql.includes("pg_advisory_unlock")) return { rows: [{ unlocked }] };
    return { rows: [] };
  });
  const release = vi.fn();
  const client = { query, release };
  const connect = vi.fn(async () => client);
  return { pool: { connect }, client, connect, query, release };
}

function createPayload(pool: unknown, found: Array<{ id: number }> = []) {
  return {
    db: { pool },
    logger: { info: vi.fn(), error: vi.fn() },
    find: vi.fn(async () => ({ docs: found })),
    update: vi.fn(async () => ({})),
  };
}

describe("publishScheduledContent advisory lock", () => {
  it("takes the lock, runs the batch and releases the lock on the same client", async () => {
    const { pool, query, connect, release } = createPool();
    const payload = createPayload(pool, [{ id: 1 }]);

    const results = await publishScheduledContent(payload as never);

    expect(connect).toHaveBeenCalledTimes(1);
    const statements = query.mock.calls.map(([sql]) => sql as string);
    expect(statements[0]).toContain("pg_try_advisory_lock");
    expect(statements.at(-1)).toContain("pg_advisory_unlock");
    expect(release).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(2); // one per schedulable collection
  });

  it("never issues lock statements through the pool itself", async () => {
    const { pool } = createPool();
    // A pool that also exposes `query` would let a regression silently go back
    // to the broken cross-connection behavior; assert it is never used.
    const poolQuery = vi.fn();
    const payload = createPayload({ ...pool, query: poolQuery });

    await publishScheduledContent(payload as never);

    expect(poolQuery).not.toHaveBeenCalled();
  });

  it("skips the run and still releases the client when the lock is unavailable", async () => {
    const { pool, release } = createPool({ locked: false });
    const payload = createPayload(pool, [{ id: 1 }]);

    const results = await publishScheduledContent(payload as never);

    expect(results).toEqual([]);
    expect(payload.update).not.toHaveBeenCalled();
    expect(payload.logger.info).toHaveBeenCalledWith(expect.stringContaining("scheduler lock"));
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("logs an error when the unlock reports the lock was not held by this session", async () => {
    const { pool } = createPool({ unlocked: false });
    const payload = createPayload(pool);

    await publishScheduledContent(payload as never);

    expect(payload.logger.error).toHaveBeenCalledWith(expect.stringContaining("advisory unlock"));
  });

  it("releases the client even when the batch throws", async () => {
    const { pool, release } = createPool();
    const payload = createPayload(pool);
    payload.find = vi.fn(async () => {
      throw new Error("query failed");
    });

    await expect(publishScheduledContent(payload as never)).rejects.toThrow("query failed");
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("runs without a lock when the adapter exposes no pool", async () => {
    const payload = createPayload(undefined, [{ id: 7 }]);

    const results = await publishScheduledContent(payload as never);

    expect(results).toHaveLength(2);
  });
});
