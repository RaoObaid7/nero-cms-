import { describe, expect, it, vi } from "vitest";
import { createPublishLifecycleHooks } from "../publishing/publishLifecycleHooks";

interface FakeRedirect {
  id: string;
  from: string;
  to: string;
  type: string;
}

function createFakePayload(initialRedirects: FakeRedirect[] = []) {
  const redirects = [...initialRedirects];
  let nextId = redirects.length + 1;

  const payload = {
    logger: { error: vi.fn() },
    find: vi.fn(async ({ where }: { collection: string; where: { from: { equals: string } } }) => {
      const docs = redirects.filter((r) => r.from === where.from.equals);
      return { docs, totalDocs: docs.length };
    }),
    create: vi.fn(async ({ data }: { data: Omit<FakeRedirect, "id"> }) => {
      const doc = { id: String(nextId++), ...data };
      redirects.push(doc);
      return doc;
    }),
    update: vi.fn(async ({ id, data }: { id: string; data: Partial<FakeRedirect> }) => {
      const doc = redirects.find((r) => r.id === id);
      if (doc) Object.assign(doc, data);
      return doc;
    }),
    delete: vi.fn(async ({ id }: { id: string }) => {
      const index = redirects.findIndex((r) => r.id === id);
      if (index >= 0) redirects.splice(index, 1);
    }),
  };

  return { payload, redirects };
}

describe("createPublishLifecycleHooks", () => {
  it("invalidates the collection tag and the document tag on any change", async () => {
    const invalidate = vi.fn();
    const { payload } = createFakePayload();
    const { afterChange } = createPublishLifecycleHooks({
      collectionSlug: "pages",
      locale: "en",
      invalidate,
    });

    await afterChange({
      doc: { slug: "about" },
      previousDoc: { slug: "about" },
      operation: "update",
      req: { payload },
    } as never);

    expect(invalidate).toHaveBeenCalledWith(
      expect.arrayContaining(["nero-content:en:pages", "nero-content:en:pages:about"]),
    );
  });

  it("also invalidates the old document tag when the slug changes", async () => {
    const invalidate = vi.fn();
    const { payload } = createFakePayload();
    const { afterChange } = createPublishLifecycleHooks({
      collectionSlug: "pages",
      locale: "en",
      invalidate,
    });

    await afterChange({
      doc: { slug: "new-slug", _status: "published" },
      previousDoc: { slug: "old-slug", _status: "published" },
      operation: "update",
      req: { payload },
    } as never);

    const tags = invalidate.mock.calls[0]?.[0] as string[];
    expect(tags).toEqual(
      expect.arrayContaining([
        "nero-content:en:pages",
        "nero-content:en:pages:new-slug",
        "nero-content:en:pages:old-slug",
      ]),
    );
  });

  it("creates a 301 redirect from the old path to the new path on slug change", async () => {
    const { payload, redirects } = createFakePayload();
    const { afterChange } = createPublishLifecycleHooks({
      collectionSlug: "pages",
      pathFor: (slug) => `/${slug}`,
    });

    await afterChange({
      doc: { slug: "new-slug", _status: "published" },
      previousDoc: { slug: "old-slug", _status: "published" },
      operation: "update",
      req: { payload },
    } as never);

    expect(redirects).toContainEqual(
      expect.objectContaining({ from: "/old-slug", to: "/new-slug", type: "301" }),
    );
  });

  it("adds a new hop for a second rename without touching the earlier redirect, so both old URLs still resolve", async () => {
    const { payload, redirects } = createFakePayload([
      { id: "r1", from: "/old-slug", to: "/mid-slug", type: "301" },
    ]);
    const { afterChange } = createPublishLifecycleHooks({
      collectionSlug: "pages",
      pathFor: (slug) => `/${slug}`,
    });

    await afterChange({
      doc: { slug: "final-slug", _status: "published" },
      previousDoc: { slug: "mid-slug", _status: "published" },
      operation: "update",
      req: { payload },
    } as never);

    // /old-slug -> /mid-slug -> /final-slug: a two-hop chain, not a broken link.
    // De-duplicating chains into a single hop is SEO-110 (redirect conflict inspection), Phase 3B.
    expect(redirects.find((r) => r.from === "/old-slug")?.to).toBe("/mid-slug");
    expect(redirects.find((r) => r.from === "/mid-slug")?.to).toBe("/final-slug");
  });

  it("repoints an existing redirect's destination instead of duplicating it when the same slug is renamed away twice", async () => {
    const { payload, redirects } = createFakePayload([
      { id: "r1", from: "/old-slug", to: "/first-attempt", type: "301" },
    ]);
    const { afterChange } = createPublishLifecycleHooks({
      collectionSlug: "pages",
      pathFor: (slug) => `/${slug}`,
    });

    // The document is renamed from "old-slug" a second time (e.g. the first rename was itself reverted).
    await afterChange({
      doc: { slug: "second-attempt", _status: "published" },
      previousDoc: { slug: "old-slug", _status: "published" },
      operation: "update",
      req: { payload },
    } as never);

    expect(redirects.filter((r) => r.from === "/old-slug")).toHaveLength(1);
    expect(redirects.find((r) => r.from === "/old-slug")?.to).toBe("/second-attempt");
  });

  it("does not create a redirect on create, or when the slug is unchanged", async () => {
    const { payload, redirects } = createFakePayload();
    const { afterChange } = createPublishLifecycleHooks({
      collectionSlug: "pages",
      pathFor: (slug) => `/${slug}`,
    });

    await afterChange({
      doc: { slug: "brand-new", _status: "published" },
      previousDoc: undefined,
      operation: "create",
      req: { payload },
    } as never);
    await afterChange({
      doc: { slug: "unchanged", _status: "published" },
      previousDoc: { slug: "unchanged", _status: "published" },
      operation: "update",
      req: { payload },
    } as never);

    expect(redirects).toHaveLength(0);
  });

  it("removes a stale redirect shadowing a slug that is live again", async () => {
    const { payload, redirects } = createFakePayload([
      { id: "r1", from: "/reused-slug", to: "/somewhere-else", type: "301" },
    ]);
    const { afterChange } = createPublishLifecycleHooks({
      collectionSlug: "pages",
      pathFor: (slug) => `/${slug}`,
    });

    await afterChange({
      doc: { slug: "reused-slug", _status: "published" },
      previousDoc: { slug: "reused-slug-draft", _status: "published" },
      operation: "update",
      req: { payload },
    } as never);

    expect(redirects.find((r) => r.from === "/reused-slug")).toBeUndefined();
  });

  it("on delete, invalidates tags and removes any redirect pointing at the deleted document's own path", async () => {
    const invalidate = vi.fn();
    const { payload, redirects } = createFakePayload([
      { id: "r1", from: "/deleted-page", to: "/elsewhere", type: "301" },
    ]);
    const { afterDelete } = createPublishLifecycleHooks({
      collectionSlug: "pages",
      locale: "en",
      pathFor: (slug) => `/${slug}`,
      invalidate,
    });

    await afterDelete({
      doc: { slug: "deleted-page" },
      req: { payload },
    } as never);

    expect(invalidate).toHaveBeenCalledWith(
      expect.arrayContaining(["nero-content:en:pages", "nero-content:en:pages:deleted-page"]),
    );
    expect(redirects.find((r) => r.from === "/deleted-page")).toBeUndefined();
  });
  /**
   * Redirect rows are publicly readable (`readAny`) and exposed through the
   * redirects API, so writing one for a document that has never been published
   * would disclose the slugs of unpublished work to anyone who asks.
   */
  it("writes no redirect when an unpublished draft's slug changes, so draft slugs stay private", async () => {
    const { payload, redirects } = createFakePayload();
    const { afterChange } = createPublishLifecycleHooks({
      collectionSlug: "pages",
      pathFor: (slug) => `/${slug}`,
    });

    await afterChange({
      doc: { slug: "project-x", _status: "draft" },
      previousDoc: { slug: "secret-acquisition", _status: "draft" },
      operation: "update",
      req: { payload },
    } as never);

    expect(redirects).toHaveLength(0);
    expect(payload.create).not.toHaveBeenCalled();
  });

  it("still invalidates cache tags for an unpublished draft even though it writes no redirect", async () => {
    const invalidate = vi.fn();
    const { payload } = createFakePayload();
    const { afterChange } = createPublishLifecycleHooks({
      collectionSlug: "pages",
      locale: "en",
      pathFor: (slug) => `/${slug}`,
      invalidate,
    });

    await afterChange({
      doc: { slug: "project-x", _status: "draft" },
      previousDoc: { slug: "secret-acquisition", _status: "draft" },
      operation: "update",
      req: { payload },
    } as never);

    expect(invalidate).toHaveBeenCalledWith(
      expect.arrayContaining([
        "nero-content:en:pages",
        "nero-content:en:pages:project-x",
        "nero-content:en:pages:secret-acquisition",
      ]),
    );
  });

  it("writes a redirect when a published document is renamed and then unpublished, since the old URL was live", async () => {
    const { payload, redirects } = createFakePayload();
    const { afterChange } = createPublishLifecycleHooks({
      collectionSlug: "pages",
      pathFor: (slug) => `/${slug}`,
    });

    await afterChange({
      doc: { slug: "renamed", _status: "draft" },
      previousDoc: { slug: "was-live", _status: "published" },
      operation: "update",
      req: { payload },
    } as never);

    expect(redirects).toContainEqual(
      expect.objectContaining({ from: "/was-live", to: "/renamed", type: "301" }),
    );
  });

  it("does not remove a redirect shadowing a draft's path, since the draft is not live at that URL", async () => {
    const { payload, redirects } = createFakePayload([
      { id: "r1", from: "/contested-slug", to: "/the-real-page", type: "301" },
    ]);
    const { afterChange } = createPublishLifecycleHooks({
      collectionSlug: "pages",
      pathFor: (slug) => `/${slug}`,
    });

    await afterChange({
      doc: { slug: "contested-slug", _status: "draft" },
      previousDoc: { slug: "something-else", _status: "draft" },
      operation: "update",
      req: { payload },
    } as never);

    expect(redirects.find((r) => r.from === "/contested-slug")?.to).toBe("/the-real-page");
  });
});
