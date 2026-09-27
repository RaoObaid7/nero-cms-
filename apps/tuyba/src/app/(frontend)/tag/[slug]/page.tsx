import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Link } from "@nero/ui";
import { ARTICLES_COLLECTION, TAGS_COLLECTION, collectionCacheTag } from "@nero/web-core";
import { contentClient } from "@/lib/content-client";
import { cachedRead } from "@/lib/cached-content";
import { breadcrumbSchema, buildMetadata, organizationSchema } from "@/lib/seo";
import { articlePath, tagPath } from "@/lib/urls";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";

const LOCALE = "en";
const PAGE_SIZE = 10;

interface TagPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

function serverURL(): string {
  return process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";
}

function parsePage(raw: string | undefined): number {
  const page = Number(raw);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function loadTag(slug: string) {
  return cachedRead(["tag", slug], [collectionCacheTag(TAGS_COLLECTION, LOCALE)], () =>
    contentClient.getTagBySlug(slug),
  );
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tag = await loadTag(slug);
  if (!tag) return {};
  return buildMetadata({
    title: tag.name,
    fallbackDescription: typeof tag.description === "string" ? tag.description : undefined,
    path: tagPath(slug),
    serverURL: serverURL(),
  });
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const { slug } = await params;
  const page = parsePage((await searchParams).page);
  const tag = await loadTag(slug);
  if (!tag) notFound();

  const origin = serverURL();
  const { docs: articles, totalPages = 1 } = await cachedRead(
    ["tag-articles", slug, String(page)],
    [collectionCacheTag(ARTICLES_COLLECTION, LOCALE)],
    () => contentClient.getArticles({ tagSlug: slug, page, limit: PAGE_SIZE }),
  );

  const breadcrumbItems = [
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: tag.name, path: tagPath(slug) },
  ];

  return (
    <main>
      <JsonLd data={organizationSchema(origin)} />
      <JsonLd data={breadcrumbSchema(breadcrumbItems, origin)} />
      <Breadcrumbs items={breadcrumbItems} />
      <h1>{tag.name}</h1>
      {articles.length === 0 ? (
        <p>No published articles with this tag yet.</p>
      ) : (
        <ul>
          {articles.map((article) => (
            <li key={article.id}>
              <Link href={articlePath(article.slug)}>{article.title}</Link>
            </li>
          ))}
        </ul>
      )}
      <nav aria-label="Tag pagination">
        {page > 1 ? <Link href={`${tagPath(slug)}?page=${page - 1}`}>Previous</Link> : null}
        {page < totalPages ? <Link href={`${tagPath(slug)}?page=${page + 1}`}>Next</Link> : null}
      </nav>
    </main>
  );
}
