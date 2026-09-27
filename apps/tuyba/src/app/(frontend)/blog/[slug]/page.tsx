import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  renderBlocks,
  ARTICLES_COLLECTION,
  collectionCacheTag,
  documentCacheTag,
} from "@nero/web-core";
import type { BlockData } from "@nero/web-core";
import { contentClient } from "@/lib/content-client";
import { cachedRead } from "@/lib/cached-content";
import { blocksRegistry } from "@/lib/blocks-registry";
import { lexicalToHtml } from "@/lib/lexical-html";
import { articleSchema, breadcrumbSchema, buildMetadata, organizationSchema } from "@/lib/seo";
import type { SeoOverrides } from "@/lib/seo";
import { articlePath } from "@/lib/urls";
import { JsonLd } from "@/components/JsonLd";
import { ArticleHero } from "@/components/ArticleHero";
import { ArticleBody } from "@/components/ArticleBody";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import type { BlockMedia } from "@nero/ui";

export const dynamic = "force-dynamic";

const LOCALE = "en";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

function serverURL(): string {
  return process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";
}

function loadArticle(slug: string) {
  return cachedRead(
    ["article", slug],
    [
      collectionCacheTag(ARTICLES_COLLECTION, LOCALE),
      documentCacheTag(ARTICLES_COLLECTION, slug, LOCALE),
    ],
    () => contentClient.getArticleBySlug(slug),
  );
}

function coverImageUrl(doc: Record<string, unknown>): string | null {
  const cover = doc.coverImage;
  return cover && typeof cover === "object" && "url" in cover && typeof cover.url === "string"
    ? cover.url
    : null;
}

function coverImageMedia(doc: Record<string, unknown>): BlockMedia | null {
  const cover = doc.coverImage;
  if (!cover || typeof cover !== "object") return null;
  const c = cover as Record<string, unknown>;
  if (typeof c.url !== "string") return null;
  return {
    url: c.url,
    alt: typeof c.alt === "string" ? c.alt : undefined,
    width: typeof c.width === "number" ? c.width : undefined,
    height: typeof c.height === "number" ? c.height : undefined,
  };
}

function authorName(doc: Record<string, unknown>): string | null {
  const author = doc.author;
  if (!author || typeof author !== "object") return null;
  const a = author as Record<string, unknown>;
  if (typeof a.displayName === "string" && a.displayName) return a.displayName;
  if (typeof a.email === "string") return a.email;
  return null;
}

function primaryCategoryName(doc: Record<string, unknown>): string | null {
  const cat = doc.primaryCategory;
  if (!cat || typeof cat !== "object") return null;
  const c = cat as Record<string, unknown>;
  return typeof c.name === "string" ? c.name : null;
}

function primaryCategorySlug(doc: Record<string, unknown>): string | null {
  const cat = doc.primaryCategory;
  if (!cat || typeof cat !== "object") return null;
  const c = cat as Record<string, unknown>;
  return typeof c.slug === "string" ? c.slug : null;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await loadArticle(slug);
  if (!article) return {};

  return buildMetadata({
    title: typeof article.title === "string" ? article.title : slug,
    fallbackDescription: typeof article.excerpt === "string" ? article.excerpt : undefined,
    path: articlePath(slug),
    seo: article.seo as SeoOverrides | undefined,
    coverImageUrl: coverImageUrl(article),
    serverURL: serverURL(),
  });
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await loadArticle(slug);
  if (!article) notFound();

  const origin = serverURL();
  const title = typeof article.title === "string" ? article.title : "Untitled";
  const bodyHtml = article.body ? lexicalToHtml(article.body) : "";
  const blocks = Array.isArray(article.layout) ? (article.layout as BlockData[]) : [];
  const catName = primaryCategoryName(article);
  const catSlug = primaryCategorySlug(article);
  const breadcrumbItems = [
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    ...(catName && catSlug ? [{ name: catName, path: `/category/${catSlug}` }] : []),
    { name: title, path: articlePath(slug) },
  ];
  const updatedAt = typeof article.updatedAt === "string" ? article.updatedAt : undefined;
  const createdAt = typeof article.createdAt === "string" ? article.createdAt : undefined;

  return (
    <>
      <JsonLd
        data={articleSchema({
          title,
          description: typeof article.excerpt === "string" ? article.excerpt : undefined,
          path: articlePath(slug),
          serverURL: origin,
          datePublished: createdAt,
          dateModified: updatedAt,
          imageUrl: coverImageUrl(article),
          authorName: authorName(article),
        })}
      />
      <JsonLd data={organizationSchema(origin)} />
      <JsonLd data={breadcrumbSchema(breadcrumbItems, origin)} />

      <Navbar />

      <ArticleHero
        title={title}
        excerpt={typeof article.excerpt === "string" ? article.excerpt : null}
        coverImage={coverImageMedia(article)}
        authorName={authorName(article)}
        publishedAt={createdAt}
        categoryName={primaryCategoryName(article)}
      />

      {/* Breadcrumb strip */}
      <div style={{ borderBottom: "1px solid var(--ty-border)", background: "var(--ty-bg-alt)" }}>
        <div className="ty-container">
          <nav aria-label="Breadcrumb">
            <ol
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.35rem",
                listStyle: "none",
                padding: "0.75rem 0",
                fontSize: "0.8rem",
                color: "var(--ty-text-muted)",
              }}
            >
              {breadcrumbItems.map((item, i) => (
                <li
                  key={item.path}
                  style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
                >
                  {i < breadcrumbItems.length - 1 ? (
                    <>
                      <Link
                        href={item.path}
                        style={{ color: "var(--ty-text-muted)", transition: "color 0.15s" }}
                        className="ty-nav-link"
                      >
                        {item.name}
                      </Link>
                      <span aria-hidden="true" style={{ color: "var(--ty-text-faint)" }}>
                        ›
                      </span>
                    </>
                  ) : (
                    <span style={{ color: "var(--ty-text)" }} aria-current="page">
                      {item.name}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>

      {/* Article body */}
      <main>
        <div
          className="ty-container ty-article-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 280px",
            gap: "4rem",
            padding: "3.5rem 1.5rem 5rem",
            alignItems: "start",
          }}
        >
          {/* Main column */}
          <article>
            {bodyHtml ? <ArticleBody html={bodyHtml} /> : null}
            {blocks.length > 0 && (
              <div style={{ marginTop: "3rem" }}>{renderBlocks(blocks, blocksRegistry)}</div>
            )}
          </article>

          {/* Sidebar */}
          <aside
            className="ty-article-sidebar"
            style={{
              position: "sticky",
              top: "80px",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            {/* Article meta */}
            <div
              style={{
                background: "var(--ty-bg-alt)",
                border: "1px solid var(--ty-border)",
                borderRadius: "var(--ty-radius)",
                padding: "1.25rem",
              }}
            >
              <p
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--ty-accent)",
                  marginBottom: "0.75rem",
                }}
              >
                About this article
              </p>
              {authorName(article) && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--ty-text-muted)",
                      marginBottom: "0.2rem",
                    }}
                  >
                    Written by
                  </p>
                  <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ty-text)" }}>
                    {authorName(article)}
                  </p>
                </div>
              )}
              {createdAt && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--ty-text-muted)",
                      marginBottom: "0.2rem",
                    }}
                  >
                    Published
                  </p>
                  <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--ty-text)" }}>
                    {new Date(createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              )}
              {catName && (
                <div>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--ty-text-muted)",
                      marginBottom: "0.2rem",
                    }}
                  >
                    Category
                  </p>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "0.2rem 0.6rem",
                      borderRadius: "9999px",
                      background: "var(--ty-accent-light)",
                      color: "var(--ty-accent-hover)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}
                  >
                    {catName}
                  </span>
                </div>
              )}
            </div>

            {/* Back link */}
            <Link
              href="/blog"
              className="ty-btn-outline-accent"
              style={{ justifyContent: "center" }}
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
              Back to Journal
            </Link>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
