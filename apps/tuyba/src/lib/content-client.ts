import { createContentClient } from "@nero/web-core";
import type {
  ContentQueryClient,
  FindArgs,
  FindByIdArgs,
  QueryClientFindByIdResult,
  QueryClientFindResult,
} from "@nero/web-core";
import { APIError } from "payload";
import { getPayloadClient } from "./get-payload-client";

/**
 * Adapts the Payload local API to the `ContentQueryClient` interface expected
 * by `@nero/web-core`. This is the one place that bridges the CMS runtime and
 * the CMS-agnostic content access layer.
 *
 * `overrideAccess: false` for published (non-draft) reads: Payload's local
 * API defaults `overrideAccess` to `true`, which skips collection access
 * control (including the published-only rule on `pages`) entirely. Without
 * it, drafts and other access-restricted documents would be returned on the
 * public read path regardless of the `draft` flag.
 *
 * Draft reads (`args.draft === true`) instead use `overrideAccess: true`.
 * This looks backwards until you look at the collection's own access rule:
 * `publishedOrAuthenticated` (`packages/cms-core/src/access/roleAccess.ts`)
 * restricts reads to published documents *unless* `req.user` is an
 * authenticated admin/editor. An anonymous visitor following a preview link
 * has no such session — so with `overrideAccess: false`, a draft read for
 * them would be silently re-filtered back down to published-only by the
 * collection's access control, on top of the `draft: true` query flag,
 * making `/preview` 404 for every genuinely anonymous preview request.
 * Verified directly: before this fix, a real anonymous browser request to
 * `/preview` with a correct `PREVIEW_SECRET` still 404'd, because the
 * `previewToken` check in `assertAuthorizedDraftAccess` passed but the
 * *collection* access rule then blocked the read anyway.
 * `overrideAccess: true` here is safe specifically because this adapter is
 * not exported — `createContentClient` (`@nero/web-core`) is the only
 * caller, and it already runs `assertAuthorizedDraftAccess` (validating the
 * `previewToken` against `PREVIEW_SECRET`) before ever passing `draft: true`
 * down to this function. That check *is* the authorization for this path;
 * `overrideAccess: true` here does not add a new one.
 *
 * Deliberately not exported: a caller holding this adapter directly could
 * request `draft: true` without a preview token and bypass that gate. The
 * composed `contentClient` below is the only supported entry point.
 */
const payloadQueryClient: ContentQueryClient = {
  async find<T>(args: FindArgs): Promise<QueryClientFindResult<T>> {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: args.collection as never,
      where: args.where as never,
      draft: args.draft,
      limit: args.limit,
      page: args.page,
      depth: args.depth,
      sort: args.sort,
      overrideAccess: args.draft === true,
    });

    return {
      docs: result.docs as T[],
      totalDocs: result.totalDocs,
      page: result.page,
      totalPages: result.totalPages,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
      accessEnforced: true,
    };
  },
  async findByID<T>(args: FindByIdArgs): Promise<QueryClientFindByIdResult<T>> {
    const payload = await getPayloadClient();
    try {
      const doc = await payload.findByID({
        collection: args.collection as never,
        id: args.id,
        draft: args.draft,
        depth: args.depth,
        overrideAccess: args.draft === true,
      });
      return { doc: doc as T, accessEnforced: true };
    } catch (error: unknown) {
      // Only a genuine miss maps to `null`. Connection failures and
      // unexpected errors must surface, not masquerade as "not found".
      if (error instanceof APIError && error.status === 404) {
        return { doc: null, accessEnforced: true };
      }
      throw error;
    }
  },
};

export const contentClient = createContentClient(payloadQueryClient);
