import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Link } from "@nero/ui";
import { ARTICLES_COLLECTION, CATEGORIES_COLLECTION, collectionCacheTag } from "@nero/web-core";
import { contentClient } from "@/lib/content-client";
import { cachedRead } from "@/lib/cached-content";
import { breadcrumbSchema, buildMetadata, organizationSchema } from "@/lib/seo";
import { articlePath, categoryPath } from "@/lib/urls";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";

const LOCALE = "en";
const PAGE_SIZE = 10;

interface CategoryPageProps {
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

function loadCategory(slug: string) {
  // Categories have no draft state (Sprint 2 decision) and are not tagged
  // per-document; the collection tag alone is enough to bust this on any
  // taxonomy edit.
  return cachedRead(["category", slug], [collectionCacheTag(CATEGORIES_COLLECTION, LOCALE)], () =>
    contentClient.getCategoryBySlug(slug),
  );
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await loadCategory(slug);
  if (!category) return {};
  return buildMetadata({
    title: category.name,
    fallbackDescription:
      typeof category.description === "string" ? category.description : undefined,
    path: categoryPath(slug),
    serverURL: serverURL(),
  });
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const page = parsePage((await searchParams).page);
  const category = await loadCategory(slug);
  if (!category) notFound();

  const origin = serverURL();
  const { docs: articles, totalPages = 1 } = await cachedRead(
    ["category-articles", slug, String(page)],
    [collectionCacheTag(ARTICLES_COLLECTION, LOCALE)],
    () => contentClient.getArticles({ categorySlug: slug, page, limit: PAGE_SIZE }),
  );

  const breadcrumbItems = [
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: category.name, path: categoryPath(slug) },
  ];

  return (
    <main>
      <JsonLd data={organizationSchema(origin)} />
      <JsonLd data={breadcrumbSchema(breadcrumbItems, origin)} />
      <Breadcrumbs items={breadcrumbItems} />
      <h1>{category.name}</h1>
      {articles.length === 0 ? (
        <p>No published articles in this category yet.</p>
      ) : (
        <ul>
          {articles.map((article) => (
            <li key={article.id}>
              <Link href={articlePath(article.slug)}>{article.title}</Link>
            </li>
          ))}
        </ul>
      )}
      <nav aria-label="Category pagination">
        {page > 1 ? <Link href={`${categoryPath(slug)}?page=${page - 1}`}>Previous</Link> : null}
        {page < totalPages ? (
          <Link href={`${categoryPath(slug)}?page=${page + 1}`}>Next</Link>
        ) : null}
      </nav>
    </main>
  );
}
