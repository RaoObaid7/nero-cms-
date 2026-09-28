import { describe, expect, it, vi } from "vitest";
import { createContentClient } from "../content";
import type {
  ContentQueryClient,
  FindArgs,
  FindByIdArgs,
  QueryClientFindByIdResult,
  QueryClientFindResult,
} from "../types";

interface StoredDoc {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published";
}

const DOCS: StoredDoc[] = [
  { id: "1", slug: "about", title: "About", status: "published" },
  { id: "2", slug: "secret-launch", title: "Secret Launch", status: "draft" },
];

function matchesWhere(doc: StoredDoc, where: Record<string, unknown> | undefined): boolean {
  if (!where) return true;
  if ("and" in where) {
    return (where.and as Record<string, unknown>[]).every((clause) => matchesWhere(doc, clause));
  }
  if ("slug" in where && doc.slug !== (where.slug as { equals: string }).equals) {
    return false;
  }
  if ("_status" in where && doc.status !== (where._status as { equals: string }).equals) {
    return false;
  }
  return true;
}

/**
 * A fake query client that actually evaluates the `where` clause it receives,
 * instead of a `vi.fn()` stub that just records arguments. This is what lets
 * the tests below prove the emitted filter really excludes drafts, rather
 * than merely asserting the shape of the call.
 */
function createFakeQueryClient(docs: StoredDoc[]): ContentQueryClient {
  const find = vi.fn(async (args: FindArgs): Promise<QueryClientFindResult<unknown>> => {
    const matching = docs.filter((doc) => matchesWhere(doc, args.where));
    const limited = args.limit ? matching.slice(0, args.limit) : matching;
    return {
      docs: limited,
      totalDocs: matching.length,
      accessEnforced: true,
    };
  });
  const findByID = vi.fn(
    async (_args: FindByIdArgs): Promise<QueryClientFindByIdResult<unknown>> => {
      return { doc: null, accessEnforced: true };
    },
  );

  return {
    find: find as unknown as ContentQueryClient["find"],
    findByID: findByID as unknown as ContentQueryClient["findByID"],
  };
}

describe("createContentClient", () => {
  it("merges a published-only _status filter into getPages' where clause by default", async () => {
    const queryClient = createFakeQueryClient(DOCS);
    const content = createContentClient(queryClient);

    await content.getPages();

    expect(queryClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "pages",
        draft: false,
        where: { _status: { equals: "published" } },
      }),
    );
  });

  it("merges the published-only filter alongside the slug filter for getPageBySlug", async () => {
    const queryClient = createFakeQueryClient(DOCS);
    const content = createContentClient(queryClient);

    await content.getPageBySlug("about");

    expect(queryClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: false,
        where: {
          and: [{ slug: { equals: "about" } }, { _status: { equals: "published" } }],
        },
      }),
    );
  });

  it("never returns a draft document through the default read path", async () => {
    const content = createContentClient(createFakeQueryClient(DOCS));

    const result = await content.getPages();

    expect(result.docs.map((doc) => doc.slug)).toEqual(["about"]);
    expect(await content.getPageBySlug("secret-launch")).toBeNull();
  });

  it("omits the published-only filter when draft:true is authorized with a valid previewToken", async () => {
    vi.stubEnv("PREVIEW_SECRET", "test-preview-secret-0123456789abcdefghij");
    const queryClient = createFakeQueryClient(DOCS);
    const content = createContentClient(queryClient);

    await content.getPageBySlug("secret-launch", {
      draft: true,
      previewToken: "test-preview-secret-0123456789abcdefghij",
    });

    expect(queryClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: true,
        where: { slug: { equals: "secret-launch" } },
      }),
    );
    vi.unstubAllEnvs();
  });

  it("returns the draft document when draft:true is authorized with a valid previewToken", async () => {
    vi.stubEnv("PREVIEW_SECRET", "test-preview-secret-0123456789abcdefghij");
    const content = createContentClient(createFakeQueryClient(DOCS));

    const draft = await content.getPageBySlug("secret-launch", {
      draft: true,
      previewToken: "test-preview-secret-0123456789abcdefghij",
    });

    expect(draft?.slug).toBe("secret-launch");
    vi.unstubAllEnvs();
  });

  it("rejects draft:true without a previewToken even when PREVIEW_SECRET is configured", async () => {
    vi.stubEnv("PREVIEW_SECRET", "test-preview-secret-0123456789abcdefghij");
    const content = createContentClient(createFakeQueryClient(DOCS));

    await expect(content.getPageBySlug("secret-launch", { draft: true })).rejects.toThrow(
      /previewToken/,
    );
    vi.unstubAllEnvs();
  });

  it("rejects draft:true with the wrong previewToken", async () => {
    vi.stubEnv("PREVIEW_SECRET", "test-preview-secret-0123456789abcdefghij");
    const content = createContentClient(createFakeQueryClient(DOCS));

    await expect(
      content.getPageBySlug("secret-launch", { draft: true, previewToken: "wrong" }),
    ).rejects.toThrow(/previewToken/);
    vi.unstubAllEnvs();
  });

  it("rejects draft:true when PREVIEW_SECRET is not configured", async () => {
    vi.stubEnv("PREVIEW_SECRET", "");
    const content = createContentClient(createFakeQueryClient(DOCS));

    await expect(
      content.getPageBySlug("secret-launch", { draft: true, previewToken: "anything" }),
    ).rejects.toThrow(/PREVIEW_SECRET/);
    vi.unstubAllEnvs();
  });

  it("rejects draft:true when PREVIEW_SECRET is too short to be a real secret", async () => {
    vi.stubEnv("PREVIEW_SECRET", "short");
    const content = createContentClient(createFakeQueryClient(DOCS));

    await expect(
      content.getPageBySlug("secret-launch", { draft: true, previewToken: "short" }),
    ).rejects.toThrow(/at least 32 characters/);
    vi.unstubAllEnvs();
  });

  it("returns null when a published slug lookup finds no document", async () => {
    const content = createContentClient(createFakeQueryClient(DOCS));

    const page = await content.getPageBySlug("missing");

    expect(page).toBeNull();
  });

  it("throws instead of returning documents when the adapter does not confirm access enforcement", async () => {
    const brokenClient: ContentQueryClient = {
      find: (async () => ({
        docs: DOCS,
        totalDocs: DOCS.length,
        accessEnforced: false,
      })) as unknown as ContentQueryClient["find"],
      findByID: async () => ({ doc: null, accessEnforced: true }),
    };
    const content = createContentClient(brokenClient);

    await expect(content.getPages()).rejects.toThrow(/access enforcement/);
  });

  it("queries the articles collection, with the same published-only default", async () => {
    const queryClient = createFakeQueryClient(DOCS);
    const content = createContentClient(queryClient);

    await content.getArticles();

    expect(queryClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "articles",
        draft: false,
        where: { _status: { equals: "published" } },
      }),
    );
  });

  it("rejects draft:true article reads without a previewToken, same as pages", async () => {
    vi.stubEnv("PREVIEW_SECRET", "test-preview-secret-0123456789abcdefghij");
    const content = createContentClient(createFakeQueryClient(DOCS));

    await expect(content.getArticleBySlug("secret-launch", { draft: true })).rejects.toThrow(
      /previewToken/,
    );
    vi.unstubAllEnvs();
  });

  it("returns the draft article when draft:true is authorized with a valid previewToken", async () => {
    vi.stubEnv("PREVIEW_SECRET", "test-preview-secret-0123456789abcdefghij");
    const content = createContentClient(createFakeQueryClient(DOCS));

    const draft = await content.getArticleBySlug("secret-launch", {
      draft: true,
      previewToken: "test-preview-secret-0123456789abcdefghij",
    });

    expect(draft?.slug).toBe("secret-launch");
    vi.unstubAllEnvs();
  });
});

interface StoredArticle {
  id: string;
  slug: string;
  title: string;
  _status: "draft" | "published";
  primaryCategory?: { slug: string };
  additionalCategories?: { slug: string }[];
  tags?: string;
}

interface StoredTerm {
  id: string;
  slug: string;
  name: string;
}

/** Reads a dot path (e.g. `primaryCategory.slug`) off a plain object, one level of relationship nesting deep. */
function readPath(doc: Record<string, unknown>, path: string): unknown[] {
  const [head, ...rest] = path.split(".");
  const value = doc[head as string];
  if (rest.length === 0) return [value];
  if (Array.isArray(value)) {
    return value.flatMap((item) => readPath(item as Record<string, unknown>, rest.join(".")));
  }
  if (value && typeof value === "object") {
    return readPath(value as Record<string, unknown>, rest.join("."));
  }
  return [undefined];
}

function matchesClause(doc: Record<string, unknown>, clause: Record<string, unknown>): boolean {
  if ("and" in clause) {
    return (clause.and as Record<string, unknown>[]).every((c) => matchesClause(doc, c));
  }
  if ("or" in clause) {
    return (clause.or as Record<string, unknown>[]).some((c) => matchesClause(doc, c));
  }
  return Object.entries(clause).every(([path, condition]) => {
    const { equals } = condition as { equals: unknown };
    return readPath(doc, path).includes(equals);
  });
}

/** A fake client for taxonomy/article-listing tests: evaluates `where`, `sort`, `page` and `limit` for real. */
function createTaxonomyFakeClient(
  articles: StoredArticle[],
  terms: StoredTerm[],
): ContentQueryClient {
  const find = vi.fn(async (args: FindArgs): Promise<QueryClientFindResult<unknown>> => {
    const source =
      args.collection === "articles" ? articles : (terms as unknown as StoredArticle[]);
    let matching = source.filter((doc) =>
      matchesClause(doc as unknown as Record<string, unknown>, args.where ?? {}),
    );
    if (args.sort === "-createdAt") {
      matching = [...matching].reverse();
    }
    const limit = args.limit ?? matching.length;
    const page = args.page ?? 1;
    const start = (page - 1) * limit;
    const docs = matching.slice(start, start + limit);
    return {
      docs,
      totalDocs: matching.length,
      page,
      totalPages: Math.max(1, Math.ceil(matching.length / limit)),
      hasNextPage: start + limit < matching.length,
      hasPrevPage: page > 1,
      accessEnforced: true,
    };
  });
  const findByID = vi.fn(
    async (_args: FindByIdArgs): Promise<QueryClientFindByIdResult<unknown>> => {
      return { doc: null, accessEnforced: true };
    },
  );
  return {
    find: find as unknown as ContentQueryClient["find"],
    findByID: findByID as unknown as ContentQueryClient["findByID"],
  };
}

describe("createContentClient — taxonomy and article listing", () => {
  const ARTICLES: StoredArticle[] = [
    {
      id: "1",
      slug: "oldest",
      title: "Oldest",
      _status: "published",
      primaryCategory: { slug: "news" },
      tags: "featured",
    },
    {
      id: "2",
      slug: "newest",
      title: "Newest",
      _status: "published",
      additionalCategories: [{ slug: "news" }],
      tags: "guides",
    },
    {
      id: "3",
      slug: "draft-one",
      title: "Draft One",
      _status: "draft",
      primaryCategory: { slug: "news" },
    },
    {
      id: "4",
      slug: "other-cat",
      title: "Other Category",
      _status: "published",
      primaryCategory: { slug: "reviews" },
    },
  ];
  const CATEGORIES: StoredTerm[] = [
    { id: "c1", slug: "news", name: "News" },
    { id: "c2", slug: "reviews", name: "Reviews" },
  ];
  const TAGS: StoredTerm[] = [
    { id: "t1", slug: "featured", name: "Featured" },
    { id: "t2", slug: "guides", name: "Guides" },
  ];

  it("lists published articles newest first, excluding drafts", async () => {
    const client = createContentClient(createTaxonomyFakeClient(ARTICLES, CATEGORIES));
    const result = await client.getArticles();

    expect(result.docs.map((doc) => doc.slug)).toEqual(["other-cat", "newest", "oldest"]);
  });

  it("filters articles by category slug, matching primary or additional category", async () => {
    const client = createContentClient(createTaxonomyFakeClient(ARTICLES, CATEGORIES));
    const result = await client.getArticles({ categorySlug: "news" });

    expect(result.docs.map((doc) => doc.slug).sort()).toEqual(["newest", "oldest"]);
  });

  it("paginates article listings", async () => {
    const client = createContentClient(createTaxonomyFakeClient(ARTICLES, CATEGORIES));
    const result = await client.getArticles({ limit: 2, page: 2 });

    expect(result.docs.map((doc) => doc.slug)).toEqual(["oldest"]);
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.hasNextPage).toBe(false);
  });

  it("reads categories without a published-only filter, since the collection has no draft state", async () => {
    const queryClient = createTaxonomyFakeClient(ARTICLES, CATEGORIES);
    const client = createContentClient(queryClient);

    const result = await client.getCategories();

    expect(result.docs.map((doc) => doc.slug)).toEqual(["news", "reviews"]);
    const call = vi.mocked(queryClient.find).mock.calls[0]?.[0] as {
      collection: string;
      where?: unknown;
    };
    expect(call.collection).toBe("categories");
    expect(call.where).toBeUndefined();
  });

  it("reads a category by slug", async () => {
    const client = createContentClient(createTaxonomyFakeClient(ARTICLES, CATEGORIES));
    expect((await client.getCategoryBySlug("reviews"))?.name).toBe("Reviews");
    expect(await client.getCategoryBySlug("missing")).toBeNull();
  });

  it("reads tags", async () => {
    const client = createContentClient(createTaxonomyFakeClient(ARTICLES, TAGS));
    const result = await client.getTags();
    expect(result.docs.map((doc) => doc.slug)).toEqual(["featured", "guides"]);
    expect((await client.getTagBySlug("featured"))?.name).toBe("Featured");
  });
});
