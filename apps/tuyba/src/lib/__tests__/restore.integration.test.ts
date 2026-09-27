import { describe, expect, it } from "vitest";

/**
 * Acceptance criterion 7 (SPRINT-02 §5): a restored version becomes the
 * served content. Requires `docker compose up -d` and `DATABASE_URI`;
 * skipped otherwise.
 */
describe.skipIf(!process.env.DATABASE_URI)(
  "version history and restore (requires DATABASE_URI)",
  () => {
    it("restoring an earlier version makes it the current, served content", async () => {
      const { getPayload } = await import("payload");
      const configModule = await import("../../payload.config");
      const { contentClient } = await import("../content-client");
      const payload = await getPayload({ config: configModule.default });

      const unique = Date.now().toString(36);
      const slug = `sprint2-restore-${unique}`;

      const page = await payload.create({
        collection: "pages",
        data: { title: "Version One", slug, _status: "published" },
        overrideAccess: true,
      });

      try {
        await payload.update({
          collection: "pages",
          id: page.id,
          data: { title: "Version Two" },
          overrideAccess: true,
        });

        // Confirm the update actually took effect before restoring.
        const current = await contentClient.getPageBySlug(slug);
        expect(current?.title).toBe("Version Two");

        const versions = await payload.findVersions({
          collection: "pages",
          where: { parent: { equals: page.id } },
          sort: "createdAt",
          overrideAccess: true,
        });
        const firstVersion = versions.docs.find(
          (version) => (version.version as { title?: string }).title === "Version One",
        );
        expect(firstVersion, "expected a version recording the original title").toBeDefined();

        await payload.restoreVersion({
          collection: "pages",
          id: String(firstVersion!.id),
          overrideAccess: true,
        });

        const restored = await contentClient.getPageBySlug(slug);
        expect(restored?.title).toBe("Version One");
      } finally {
        await payload.delete({ collection: "pages", id: page.id, overrideAccess: true });
      }
    });
  },
);
