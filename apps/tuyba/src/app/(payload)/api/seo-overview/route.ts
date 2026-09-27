import { type NextRequest, NextResponse } from "next/server";
import { getPayloadClient } from "@/lib/get-payload-client";

/**
 * SEO-122: Aggregate SEO overview (GET /api/seo-overview).
 * Admin only. Returns counts of published documents with missing SEO fields.
 */
export const dynamic = "force-dynamic";

async function isAdmin(req: NextRequest): Promise<boolean> {
  try {
    const payload = await getPayloadClient();
    const authHeader = req.headers.get("Authorization");
    const cookie = req.headers.get("cookie") ?? "";
    const result = (await (
      payload as unknown as {
        auth(args: { headers: Headers }): Promise<{ user?: { roles?: string[] } } | null>;
      }
    ).auth({
      headers: new Headers({ Authorization: authHeader ?? "", cookie }),
    })) as { user?: { roles?: string[] } } | null;
    return Boolean(result?.user?.roles?.includes("admin"));
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await getPayloadClient();

  const [pagesResult, articlesResult] = await Promise.all([
    payload.find({
      collection: "pages",
      where: { _status: { equals: "published" } },
      limit: 0,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: "articles",
      where: { _status: { equals: "published" } },
      limit: 0,
      depth: 0,
      overrideAccess: true,
    }),
  ]);

  type Doc = Record<string, unknown>;
  function seoField(doc: Doc, field: string): unknown {
    const seo = doc.seo;
    if (!seo || typeof seo !== "object") return undefined;
    return (seo as Record<string, unknown>)[field];
  }

  const allPages = pagesResult.docs as unknown as Doc[];
  const allArticles = articlesResult.docs as unknown as Doc[];
  const allDocs = [...allPages, ...allArticles];

  const overview = {
    totalPublished: allDocs.length,
    pages: allPages.length,
    articles: allArticles.length,
    missingMetaTitle: allDocs.filter((d) => !seoField(d, "metaTitle")).length,
    missingMetaDescription: allDocs.filter((d) => !seoField(d, "metaDescription")).length,
    noindexed: allDocs.filter((d) => seoField(d, "noindex") === true).length,
    articlesMissingCoverImage: allArticles.filter((d) => !d.coverImage).length,
    articlesMissingPrimaryCategory: allArticles.filter((d) => !d.primaryCategory).length,
  };

  return NextResponse.json(overview, { headers: { "Cache-Control": "no-store" } });
}
