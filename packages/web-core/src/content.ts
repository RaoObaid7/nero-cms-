import { createHash, timingSafeEqual } from "node:crypto";
import type { ContentQueryClient, FindResult, QueryDraftOption } from "./types";

export const PAGES_COLLECTION = "pages";
export const ARTICLES_COLLECTION = "articles";
export const CATEGORIES_COLLECTION = "categories";
export const TAGS_COLLECTION = "tags";

/** Deterministic listing order so pagination and repeat reads stay stable. */
const DEFAULT_SORT_BY_SLUG = "slug";

export interface PageDocument {
  id: string | number;
  slug: string;
  title: string;
  [key: string]: unknown;
}

export interface ArticleDocument {
  id: string | number;
  slug: string;
  title: string;
  [key: string]: unknown;
}

/** Categories and tags carry no draft state — see `Categories.ts`/`Tags.ts` for why. */
export interface CategoryDocument {
  id: string | number;
  slug: string;
  name: string;
  [key: string]: unknown;
}

export interface TagDocument {
  id: string | number;
  slug: string;
  name: string;
  [key: string]: unknown;
}

export interface ArticleListOptions extends QueryDraftOption {
  limit?: number;
  /** 1-based page number. Omit for the first page. */
  page?: number;
  /** Restricts the listing to articles whose primary or additional category matches this slug. */
  categorySlug?: string;
  /** Restricts the listing to articles carrying this tag slug. */
  tagSlug?: string;
}

export interface ContentClient {
  /** Published pages by default. Pass `draft: true` (with a `previewToken`) only from authorized preview code. */
  getPages(options?: QueryDraftOption & { limit?: number }): Promise<FindResult<PageDocument>>;
  /** Published page by slug by default, or `null` if no matching document exists. */
  getPageBySlug(slug: string, options?: QueryDraftOption): Promise<PageDocument | null>;
  /**
   * Published articles by default, newest first, optionally paginated and
   * filtered by category/tag slug. Pass `draft: true` (with a
   * `previewToken`) only from authorized preview code.
   */
  getArticles(options?: ArticleListOptions): Promise<FindResult<ArticleDocument>>;
  /** Published article by slug by default, or `null` if no matching document exists. */
  getArticleBySlug(slug: string, options?: QueryDraftOption): Promise<ArticleDocument | null>;
  /** Every category. Categories are unversioned and always publicly readable. */
  getCategories(options?: { limit?: number }): Promise<FindResult<CategoryDocument>>;
  /** Category by slug, or `null` if no matching document exists. */
  getCategoryBySlug(slug: string): Promise<CategoryDocument | null>;
  /** Every tag. Tags are unversioned and always publicly readable. */
  getTags(options?: { limit?: number }): Promise<FindResult<TagDocument>>;
  /** Tag by slug, or `null` if no matching document exists. */
  getTagBySlug(slug: string): Promise<TagDocument | null>;
}

/**
 * Asserts that the query client confirmed access enforcement for a query.
 * The type system already requires adapters to set `accessEnforced: true`
 * literally, but this guards the runtime boundary too — for example a
 * JavaScript caller, or an adapter that computes the flag instead of
 * asserting it — so a broken adapter fails loudly instead of silently
 * leaking unauthorized documents.
 */
function assertAccessEnforced(accessEnforced: true, source: string): void {
  if (accessEnforced !== true) {
    throw new Error(
      `${source}: content query client did not confirm access enforcement for this query`,
    );
  }
}

/** Minimum length for `PREVIEW_SECRET`; a short secret is brute-forceable. */
const MIN_PREVIEW_SECRET_LENGTH = 32;

/**
 * Compares two strings in time independent of how many leading characters
 * match, so a caller cannot learn the secret one character at a time by
 * measuring response latency. Hashing first keeps the compared buffers equal
 * in length, which `timingSafeEqual` requires.
 */
function secureEquals(a: string, b: string): boolean {
  const hashedA = createHash("sha256").update(a).digest();
  const hashedB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashedA, hashedB);
}

/**
 * Draft reads skip the published-only filter below, so they are the one path
 * that can surface unpublished content. The only gate on that path is this
 * check: a `previewToken` that matches `PREVIEW_SECRET`. Without it, any
 * caller passing `draft: true` could read unpublished documents.
 */
function assertAuthorizedDraftAccess(previewToken: string | undefined): void {
  const secret = process.env.PREVIEW_SECRET;
  if (!secret) {
    throw new Error("Draft reads require the PREVIEW_SECRET environment variable to be set.");
  }
  if (secret.length < MIN_PREVIEW_SECRET_LENGTH) {
    throw new Error(
      `PREVIEW_SECRET must be at least ${MIN_PREVIEW_SECRET_LENGTH} characters to gate draft reads.`,
    );
  }
  if (!previewToken || !secureEquals(previewToken, secret)) {
    throw new Error("Draft reads require a valid previewToken.");
  }
}

/** Merges a published-only `_status` filter into `where`, unless `draft` is true. */
function withPublishedFilter(
  where: Record<string, unknown> | undefined,
  draft: boolean,
): Record<string, unknown> | undefined {
  if (draft) return where;
  const publishedOnly = { _status: { equals: "published" } };
  return where ? { and: [where, publishedOnly] } : publishedOnly;
}

function paginationFields<T>(
  result: FindResult<T>,
): Pick<FindResult<T>, "page" | "totalPages" | "hasNextPage" | "hasPrevPage"> {
  return {
    page: result.page,
    totalPages: result.totalPages,
    hasNextPage: result.hasNextPage,
    hasPrevPage: result.hasPrevPage,
  };
}

/**
 * One collection's published-by-default list/by-slug reader, sharing the
 * draft-authorization gate, published-only filter and access-enforcement
 * assertion across every schedulable collection (`pages`, `articles`, and any
 * future one) instead of duplicating them per collection.
 */
function createCollectionReader<TDoc extends { slug: string }>(
  client: ContentQueryClient,
  collection: string,
) {
  return {
    async list(
      options: QueryDraftOption & { limit?: number; page?: number } = {},
    ): Promise<FindResult<TDoc>> {
      const draft = options.draft === true;
      if (draft) assertAuthorizedDraftAccess(options.previewToken);

      const result = await client.find<TDoc>({
        collection,
        where: withPublishedFilter(undefined, draft),
        draft,
        limit: options.limit,
        page: options.page,
        sort: DEFAULT_SORT_BY_SLUG,
      });
      assertAccessEnforced(result.accessEnforced, `${collection}.list`);

      return { docs: result.docs, totalDocs: result.totalDocs, ...paginationFields(result) };
    },
    async bySlug(slug: string, options: QueryDraftOption = {}): Promise<TDoc | null> {
      const draft = options.draft === true;
      if (draft) assertAuthorizedDraftAccess(options.previewToken);

      const result = await client.find<TDoc>({
        collection,
        where: withPublishedFilter({ slug: { equals: slug } }, draft),
        draft,
        limit: 1,
      });
      assertAccessEnforced(result.accessEnforced, `${collection}.bySlug`);

      return result.docs[0] ?? null;
    },
  };
}

/**
 * Reader for unversioned, always-public collections (`categories`, `tags`):
 * no draft gate, no `_status` filter — neither field exists on these
 * collections, so applying the published-only filter used for pages/articles
 * would silently return zero rows instead of every document.
 */
function createPublicCollectionReader<TDoc extends { slug: string }>(
  client: ContentQueryClient,
  collection: string,
) {
  return {
    async list(options: { limit?: number } = {}): Promise<FindResult<TDoc>> {
      const result = await client.find<TDoc>({
        collection,
        draft: false,
        limit: options.limit,
        sort: DEFAULT_SORT_BY_SLUG,
      });
      assertAccessEnforced(result.accessEnforced, `${collection}.list`);
      return { docs: result.docs, totalDocs: result.totalDocs };
    },
    async bySlug(slug: string): Promise<TDoc | null> {
      const result = await client.find<TDoc>({
        collection,
        draft: false,
        where: { slug: { equals: slug } },
        limit: 1,
      });
      assertAccessEnforced(result.accessEnforced, `${collection}.bySlug`);
      return result.docs[0] ?? null;
    },
  };
}

/** Newest-first sort for article listings. `createdAt` is always populated; `publishAt` is optional/scheduling-only. */
const ARTICLE_LIST_SORT = "-createdAt";

/**
 * Articles get their own listing function instead of sharing
 * `createCollectionReader.list` verbatim: taxonomy filtering and
 * newest-first ordering are specific to the article listing/category/tag
 * routes and don't apply to `pages`.
 */
async function listArticles(
  client: ContentQueryClient,
  options: ArticleListOptions = {},
): Promise<FindResult<ArticleDocument>> {
  const draft = options.draft === true;
  if (draft) assertAuthorizedDraftAccess(options.previewToken);

  const taxonomyClauses: Record<string, unknown>[] = [];
  if (options.categorySlug) {
    taxonomyClauses.push({
      or: [
        { "primaryCategory.slug": { equals: options.categorySlug } },
        { "additionalCategories.slug": { equals: options.categorySlug } },
      ],
    });
  }
  if (options.tagSlug) {
    taxonomyClauses.push({ "tags.slug": { equals: options.tagSlug } });
  }
  const baseWhere = taxonomyClauses.length > 0 ? { and: taxonomyClauses } : undefined;

  const result = await client.find<ArticleDocument>({
    collection: ARTICLES_COLLECTION,
    where: withPublishedFilter(baseWhere, draft),
    draft,
    limit: options.limit,
    page: options.page,
    sort: ARTICLE_LIST_SORT,
  });
  assertAccessEnforced(result.accessEnforced, `${ARTICLES_COLLECTION}.list`);

  return { docs: result.docs, totalDocs: result.totalDocs, ...paginationFields(result) };
}

/**
 * Builds the public content access layer on top of an injected query client.
 * Every method resolves `draft` to `false` unless the caller explicitly
 * overrides it, so published-only reads are the default everywhere.
 */
export function createContentClient(client: ContentQueryClient): ContentClient {
  const pages = createCollectionReader<PageDocument>(client, PAGES_COLLECTION);
  const articles = createCollectionReader<ArticleDocument>(client, ARTICLES_COLLECTION);
  const categories = createPublicCollectionReader<CategoryDocument>(client, CATEGORIES_COLLECTION);
  const tags = createPublicCollectionReader<TagDocument>(client, TAGS_COLLECTION);

  return {
    getPages: (options) => pages.list(options),
    getPageBySlug: (slug, options) => pages.bySlug(slug, options),
    getArticles: (options) => listArticles(client, options),
    getArticleBySlug: (slug, options) => articles.bySlug(slug, options),
    getCategories: (options) => categories.list(options),
    getCategoryBySlug: (slug) => categories.bySlug(slug),
    getTags: (options) => tags.list(options),
    getTagBySlug: (slug) => tags.bySlug(slug),
  };
}
