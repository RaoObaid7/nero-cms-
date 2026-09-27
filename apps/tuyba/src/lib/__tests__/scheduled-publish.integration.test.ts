import { describe, expect, it } from "vitest";

/**
 * Acceptance criterion 6 (SPRINT-02 §5): a document scheduled for the future
 * must not appear in published reads before its time, and the scheduler must
 * publish it once due. Requires `docker compose up -d` and `DATABASE_URI`;
 * skipped otherwise.
 */
describe.skipIf(!process.env.DATABASE_URI)("scheduled publishing (requires DATABASE_URI)", () => {
  it("keeps a future-scheduled page out of published reads until publishScheduledContent runs", async () => {
    const { getPayload } = await import("payload");
    const { publishScheduledContent } = await import("@nero/cms-core");
    const configModule = await import("../../payload.config");
    const { contentClient } = await import("../content-client");
    const payload = await getPayload({ config: configModule.default });

    const unique = Date.now().toString(36);
    const slug = `sprint2-scheduled-${unique}`;
    const publishAt = new Date(Date.now() + 60_000); // one minute in the future

    // Requesting `_status: published` with a future `publishAt` must not
    // actually publish — `enforceScheduledPublish` forces this back to draft.
    const page = await payload.create({
      collection: "pages",
      data: {
        title: "Scheduled page",
        slug,
        publishAt: publishAt.toISOString(),
        _status: "published",
      },
      overrideAccess: true,
    });

    try {
      const stored = await payload.findByID({
        collection: "pages",
        id: page.id,
        overrideAccess: true,
        draft: true,
      });
      expect(stored._status).toBe("draft");

      const beforeDue = await contentClient.getPageBySlug(slug);
      expect(beforeDue).toBeNull();

      // Not due yet: a run "now" must not publish it.
      const tooEarly = await publishScheduledContent(payload, { now: new Date() });
      expect(tooEarly.find((r) => r.id === page.id)).toBeUndefined();
      expect(await contentClient.getPageBySlug(slug)).toBeNull();

      // Due: a run at/after publishAt must publish it exactly once.
      const due = new Date(publishAt.getTime() + 1000);
      const published = await publishScheduledContent(payload, { now: due });
      expect(published.some((r) => r.collection === "pages" && r.id === page.id)).toBe(true);

      const afterDue = await contentClient.getPageBySlug(slug);
      expect(afterDue?.slug).toBe(slug);

      // Idempotent: running again at the same "now" does nothing further.
      const secondRun = await publishScheduledContent(payload, { now: due });
      expect(secondRun.find((r) => r.id === page.id)).toBeUndefined();
    } finally {
      await payload.delete({ collection: "pages", id: page.id, overrideAccess: true });
    }
  });
});
