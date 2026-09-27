import { NextResponse } from "next/server";
import { getPayloadClient } from "@/lib/get-payload-client";

function serverURL(): string {
  return process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";
}

function formatDate(val: unknown): string {
  if (typeof val === "string") return new Date(val).toISOString();
  return new Date().toISOString();
}

/**
 * SEO-108: News sitemap (GET /api/news-sitemap).
 * Returns published articles with `newsArticle: true`, excluding noindex
 * and scheduled-but-not-due content. Requires news sitemap to be enabled in
 * SiteSettings; returns 404 otherwise.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const origin = serverURL();

  let publicationName = "TUYBA";
  let newsEnabled = false;

  try {
    const payload = await getPayloadClient();
    type SiteSettingsGlobal = { newsEnabled?: boolean; publicationName?: string };
    const settings = await (
      payload.findGlobal as (args: {
        slug: string;
        overrideAccess: boolean;
      }) => Promise<SiteSettingsGlobal | null>
    )({
      slug: "site-settings",
      overrideAccess: true,
    });

    newsEnabled = Boolean(settings?.newsEnabled);
    if (settings?.publicationName) publicationName = settings.publicationName;
  } catch {
    // settings unavailable — treat as disabled
  }

  if (!newsEnabled) {
    return new NextResponse("News sitemap is not enabled.", { status: 404 });
  }

  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: "articles",
    where: {
      and: [
        { _status: { equals: "published" } },
        { newsArticle: { equals: true } },
        { "seo.noindex": { not_equals: true } },
      ],
    },
    limit: 1000,
    overrideAccess: false,
  });

  const articles = result.docs as unknown as Array<Record<string, unknown>>;

  const items = articles.map((article) => {
    const slug = String(article.slug ?? "");
    const title = String(article.title ?? "");
    const pubDate = formatDate(article.createdAt ?? article.updatedAt);

    return `  <url>
    <loc>${origin}/blog/${slug}</loc>
    <news:news>
      <news:publication>
        <news:name>${publicationName}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${title.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c] ?? c)}</news:title>
    </news:news>
  </url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items.join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
