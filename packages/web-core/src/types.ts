/**
 * Draft access is opt-in and explicit. Every read helper in this package
 * defaults `draft` to `false`; callers that need preview content must pass
 * `draft: true` deliberately from an authorized code path, along with a
 * `previewToken` that matches the `PREVIEW_SECRET` environment variable.
 */
export interface QueryDraftOption {
  draft?: boolean;
  previewToken?: string;
}

export interface FindArgs extends QueryDraftOption {
  collection: string;
  where?: Record<string, unknown>;
  limit?: number;
  /** 1-based page number for listing routes. Omit for the first page. */
  page?: number;
  depth?: number;
  sort?: string;
}

export interface FindByIdArgs extends QueryDraftOption {
  collection: string;
  id: string | number;
  depth?: number;
}

export interface FindResult<T> {
  docs: T[];
  totalDocs: number;
  /** 1-based current page. Present when the adapter paginates the query. */
  page?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

/**
 * Result shape required from a `ContentQueryClient`. The literal `true` type
 * on `accessEnforced` forces an adapter to explicitly assert that it applied
 * access control (e.g. Payload's `overrideAccess: false`) for this query — an
 * adapter that never sets the field fails to type-check, and `createContentClient`
 * additionally asserts it at runtime so an adapter that lies with a non-literal
 * `false` value still fails loudly instead of silently leaking documents.
 */
export interface QueryClientFindResult<T> extends FindResult<T> {
  accessEnforced: true;
}

export interface QueryClientFindByIdResult<T> {
  doc: T | null;
  accessEnforced: true;
}

/**
 * Minimal shape web-core needs from a content source. Implemented in the
 * consuming application (e.g. by wrapping the Payload local API) so this
 * package never imports Payload or its admin UI directly.
 */
export interface ContentQueryClient {
  find<T>(args: FindArgs): Promise<QueryClientFindResult<T>>;
  findByID<T>(args: FindByIdArgs): Promise<QueryClientFindByIdResult<T>>;
}
