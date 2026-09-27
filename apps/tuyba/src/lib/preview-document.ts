import { contentClient } from "./content-client";

export type PreviewCollection = "pages" | "articles";

export function isPreviewCollection(value: string | null | undefined): value is PreviewCollection {
  return value === "pages" || value === "articles";
}

export interface ResolvedPreviewDocument {
  collection: PreviewCollection;
  doc: Record<string, unknown>;
}

async function findDocument(
  collection: PreviewCollection,
  slug: string,
  options: { draft?: boolean; previewToken?: string },
): Promise<Record<string, unknown> | null> {
  const doc =
    collection === "pages"
      ? await contentClient.getPageBySlug(slug, options)
      : await contentClient.getArticleBySlug(slug, options);
  return doc as Record<string, unknown> | null;
}

/**
 * Resolves what `/preview` should render. With a `secret` that matches
 * `PREVIEW_SECRET`, reads draft content through `@nero/web-core`'s existing
 * preview-token gate (this is the "authorized preview code" that gate was
 * built for). Without a matching secret — missing, wrong, or the env var
 * unset/misconfigured — falls back to the same published-only read every
 * other caller gets. Returns `null` for bad params or when nothing is
 * renderable at all; the caller (the page component) turns that into a 404,
 * never a raw draft-access error.
 */
export async function resolvePreviewDocument(params: {
  collection?: string | null;
  slug?: string | null;
  secret?: string | null;
}): Promise<ResolvedPreviewDocument | null> {
  const { collection, slug, secret } = params;
  if (!isPreviewCollection(collection) || !slug) return null;

  let doc: Record<string, unknown> | null = null;

  if (secret) {
    try {
      doc = await findDocument(collection, slug, { draft: true, previewToken: secret });
    } catch (error: unknown) {
      // Invalid/expired token, or PREVIEW_SECRET misconfigured: fall through
      // to the published-only read below rather than leaking the reason to the
      // caller. Log it, though — a misconfigured secret and a mistyped one look
      // identical to an editor whose preview silently shows published content.
      console.warn(
        `preview: draft read rejected for ${collection}/${slug}, falling back to published content`,
        error,
      );
      doc = null;
    }
  }

  if (!doc) {
    doc = await findDocument(collection, slug, {});
  }

  return doc ? { collection, doc } : null;
}
