import Link from "next/link";
import { ARTICLES_COLLECTION, collectionCacheTag } from "@nero/web-core";
import type { Metadata } from "next";
import { contentClient } from "@/lib/content-client";
import { cachedRead } from "@/lib/cached-content";
import { buildMetadata, breadcrumbSchema, organizationSchema, websiteSchema } from "@/lib/seo";
import { articlePath } from "@/lib/urls";
import { JsonLd } from "@/components/JsonLd";
import { Navbar } from "@/components/Navbar";
import { ArticleCard } from "@/components/ArticleCard";
import { SiteFooter } from "@/components/SiteFooter";

export const dynamic = "force-dynamic";

const LOCALE = "en";
const PAGE_SIZE = 12;

interface BlogIndexProps {
  searchParams: Promise<{ page?: string }>;
}

function serverURL(): string {
  return process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";
}

function parsePage(raw: string | undefined): number {
  const page = Number(raw);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: "Journal",
    fallbackDescription: "Halal travel guides, hotel reviews and destination tips from TUYBA.",
    path: "/blog",
    serverURL: serverURL(),
  });
}

function getPrimaryCategory(article: Record<string, unknown>): string | undefined {
  const cat = article.primaryCategory;
  if (!cat || typeof cat !== "object") return undefined;
  return typeof (cat as Record<string, unknown>).name === "string"
    ? ((cat as Record<string, unknown>).name as string)
    : undefined;
}

function getCoverImage(
  article: Record<string, unknown>,
): { url: string; alt?: string } | undefined {
  const cover = article.coverImage;
  if (!cover || typeof cover !== "object") return undefined;
  const image = cover as Record<string, unknown>;
  if (typeof image.url !== "string") return undefined;
  return {
    url: image.url,
    ...(typeof image.alt === "string" ? { alt: image.alt } : {}),
  };
}

export default async function BlogIndexPage({ searchParams }: BlogIndexProps) {
  const page = parsePage((await searchParams).page);
  const origin = serverURL();

  const { docs: articles, totalPages = 1 } = await cachedRead(
    ["blog-index", String(page)],
    [collectionCacheTag(ARTICLES_COLLECTION, LOCALE)],
    () => contentClient.getArticles({ page, limit: PAGE_SIZE }),
  );

  const breadcrumbItems = [
    { name: "Home", path: "/" },
    { name: "Journal", path: "/blog" },
  ];

  return (
    <>
      <JsonLd data={websiteSchema(origin)} />
      <JsonLd data={organizationSchema(origin)} />
      <JsonLd data={breadcrumbSchema(breadcrumbItems, origin)} />
      <Navbar />

      {/* Page header */}
      <section
        style={{
          background: "var(--ty-bg-alt)",
          borderBottom: "1px solid var(--ty-border)",
          padding: "3.5rem 1.5rem 3rem",
        }}
      >
        <div className="ty-container">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" style={{ marginBottom: "1.25rem" }}>
            <ol
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                listStyle: "none",
                fontSize: "0.8rem",
                color: "var(--ty-text-muted)",
              }}
            >
              <li>
                <Link href="/" style={{ color: "var(--ty-text-muted)", transition: "color 0.15s" }}>
                  Home
                </Link>
              </li>
              <li aria-hidden="true" style={{ color: "var(--ty-text-faint)" }}>
                ›
              </li>
              <li style={{ color: "var(--ty-text)" }} aria-current="page">
                Journal
              </li>
            </ol>
          </nav>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--ty-accent)",
                  marginBottom: "0.4rem",
                }}
              >
                Journal
              </p>
              <h1
                style={{
                  fontFamily: "var(--ty-font-head)",
                  fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)",
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                  color: "var(--ty-text)",
                }}
              >
                Travel Guides & Stories
              </h1>
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--ty-text-muted)" }}>
              {articles.length > 0
                ? `${articles.length} article${articles.length !== 1 ? "s" : ""}`
                : "No articles yet"}
              {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ""}
            </p>
          </div>
        </div>
      </section>

      {/* Article grid */}
      <main style={{ padding: "3.5rem 1.5rem 5rem" }}>
        <div className="ty-container">
          {articles.length === 0 ? (
            <div
              style={{
                padding: "5rem 2rem",
                textAlign: "center",
                border: "2px dashed var(--ty-border)",
                borderRadius: "var(--ty-radius-lg)",
                color: "var(--ty-text-muted)",
              }}
            >
              <svg
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
                style={{ margin: "0 auto 1.25rem" }}
                aria-hidden="true"
              >
                <rect
                  x="6"
                  y="8"
                  width="36"
                  height="32"
                  rx="4"
                  stroke="#cbd5e1"
                  strokeWidth="1.8"
                />
                <path
                  d="M14 18h20M14 24h14"
                  stroke="#cbd5e1"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              <h2
                style={{
                  fontFamily: "var(--ty-font-head)",
                  fontWeight: 700,
                  fontSize: "1.2rem",
                  color: "var(--ty-text)",
                  marginBottom: "0.5rem",
                }}
              >
                The journal is empty
              </h2>
              <p style={{ fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                Run{" "}
                <code
                  style={{
                    background: "var(--ty-bg-alt)",
                    padding: "0.15rem 0.4rem",
                    borderRadius: "4px",
                    fontSize: "0.8rem",
                  }}
                >
                  pnpm seed:articles
                </code>{" "}
                from{" "}
                <code
                  style={{
                    background: "var(--ty-bg-alt)",
                    padding: "0.15rem 0.4rem",
                    borderRadius: "4px",
                    fontSize: "0.8rem",
                  }}
                >
                  apps/tuyba
                </code>{" "}
                to add sample articles.
              </p>
              <Link
                href="/admin/collections/articles/create"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.65rem 1.25rem",
                  borderRadius: "var(--ty-radius-sm)",
                  background: "var(--ty-accent)",
                  color: "#fff",
                  fontFamily: "var(--ty-font-head)",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                }}
              >
                Write first article
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path
                    d="M2.5 7h9M7.5 3l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "1.25rem",
              }}
            >
              {articles.map((article) => (
                <ArticleCard
                  key={article.id}
                  slug={article.slug}
                  title={article.title}
                  excerpt={
                    typeof (article as Record<string, unknown>).excerpt === "string"
                      ? ((article as Record<string, unknown>).excerpt as string)
                      : undefined
                  }
                  coverImage={getCoverImage(article as Record<string, unknown>)}
                  categoryName={getPrimaryCategory(article as Record<string, unknown>)}
                  isPodcast={Boolean((article as Record<string, unknown>).isPodcastEpisode)}
                  isNews={Boolean((article as Record<string, unknown>).newsArticle)}
                  href={articlePath(article.slug)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              aria-label="Blog pagination"
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "0.5rem",
                marginTop: "3.5rem",
              }}
            >
              {page > 1 ? (
                <Link
                  href={`/blog?page=${page - 1}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.6rem 1.1rem",
                    borderRadius: "var(--ty-radius-sm)",
                    border: "1px solid var(--ty-border)",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "var(--ty-text-muted)",
                    transition: "border-color 0.15s, color 0.15s",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path
                      d="M11 7H2M6 3L2 7l4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Previous
                </Link>
              ) : null}

              <span
                style={{ fontSize: "0.85rem", color: "var(--ty-text-muted)", padding: "0 0.5rem" }}
              >
                {page} / {totalPages}
              </span>

              {page < totalPages ? (
                <Link
                  href={`/blog?page=${page + 1}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.6rem 1.1rem",
                    borderRadius: "var(--ty-radius-sm)",
                    border: "1px solid var(--ty-border)",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "var(--ty-text-muted)",
                    transition: "border-color 0.15s, color 0.15s",
                  }}
                >
                  Next
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path
                      d="M3 7h9M7.5 3l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              ) : null}
            </nav>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
