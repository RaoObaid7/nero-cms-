import type { MetadataRoute } from "next";
import { contentClient } from "@/lib/content-client";
import { articlePath, categoryPath, pagePath, tagPath } from "@/lib/urls";

// Reads through the Payload local API; excludes drafts and
// scheduled-but-not-due content via the same published-only default every
// other public read uses (SEO-107).
export const dynamic = "force-dynamic";

function serverURL(): string {
  return process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";
}

function isNoindex(doc: Record<string, unknown>): boolean {
  const seo = doc.seo;
  return Boolean(seo && typeof seo === "object" && "noindex" in seo && seo.noindex === true);
}

function asDate(value: unknown): Date | undefined {
  return typeof value === "string" ? new Date(value) : undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = serverURL();

  // `limit: 0` asks Payload for every matching document instead of its
  // default page size, so the sitemap is never silently truncated.
  const [{ docs: pages }, { docs: articles }, { docs: categories }, { docs: tags }] =
    await Promise.all([
      contentClient.getPages({ limit: 0 }),
      contentClient.getArticles({ limit: 0 }),
      contentClient.getCategories({ limit: 0 }),
      contentClient.getTags({ limit: 0 }),
    ]);

  const entries: MetadataRoute.Sitemap = [
    { url: origin, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/blog`, changeFrequency: "daily", priority: 0.8 },
  ];

  for (const page of pages) {
    if (isNoindex(page)) continue;
    entries.push({
      url: `${origin}${pagePath(page.slug)}`,
      lastModified: asDate(page.updatedAt),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  for (const article of articles) {
    if (isNoindex(article)) continue;
    entries.push({
      url: `${origin}${articlePath(article.slug)}`,
      lastModified: asDate(article.updatedAt),
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  for (const category of categories) {
    entries.push({
      url: `${origin}${categoryPath(category.slug)}`,
      changeFrequency: "weekly",
      priority: 0.4,
    });
  }

  for (const tag of tags) {
    entries.push({
      url: `${origin}${tagPath(tag.slug)}`,
      changeFrequency: "weekly",
      priority: 0.3,
    });
  }

  return entries;
}
