import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { renderBlocks } from "@nero/web-core";
import type { BlockData } from "@nero/web-core";
import { resolvePreviewDocument } from "../../lib/preview-document";
import { blocksRegistry } from "../../lib/blocks-registry";
import { lexicalToHtml } from "../../lib/lexical-html";
import { ArticleHero } from "../../components/ArticleHero";
import { ArticleBody } from "../../components/ArticleBody";
import { Navbar } from "../../components/Navbar";
import { SiteFooter } from "../../components/SiteFooter";
import type { BlockMedia } from "@nero/ui";

// Reads through the Payload local API on every request via `resolvePreviewDocument`.
export const dynamic = "force-dynamic";

interface PreviewSearchParams {
  collection?: string;
  slug?: string;
  secret?: string;
}

interface PreviewPageProps {
  searchParams: Promise<PreviewSearchParams>;
}

export function generateMetadata(): Metadata {
  return { robots: { index: false, follow: false } };
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

function categoryName(doc: Record<string, unknown>): string | null {
  const cat = doc.primaryCategory;
  if (!cat || typeof cat !== "object") return null;
  const c = cat as Record<string, unknown>;
  return typeof c.name === "string" ? c.name : null;
}

export default async function PreviewPage({ searchParams }: PreviewPageProps) {
  const resolved = await resolvePreviewDocument(await searchParams);
  if (!resolved) notFound();

  const { collection, doc } = resolved;
  const title = typeof doc.title === "string" ? doc.title : "Untitled";
  const bodyField = collection === "pages" ? doc.content : doc.body;
  const bodyHtml = bodyField ? lexicalToHtml(bodyField) : "";
  const blocks = Array.isArray(doc.layout) ? (doc.layout as BlockData[]) : [];
  const createdAt = typeof doc.createdAt === "string" ? doc.createdAt : undefined;
  const catName = categoryName(doc);

  return (
    <>
      {/* Draft preview banner */}
      <div
        style={{
          background: "#7c3aed",
          color: "#fff",
          padding: "0.6rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          fontSize: "0.8rem",
          fontFamily: "var(--ty-font-head)",
          fontWeight: 600,
          letterSpacing: "0.01em",
          zIndex: 100,
          position: "relative",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 4v3.5L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Draft preview — this content is not yet published
        </span>
        <Link
          href="/admin"
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: "0.75rem",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
          }}
        >
          ← Back to Admin
        </Link>
      </div>

      <Navbar />

      {collection === "articles" ? (
        <>
          <ArticleHero
            title={title}
            excerpt={typeof doc.excerpt === "string" ? doc.excerpt : null}
            coverImage={coverImageMedia(doc)}
            authorName={authorName(doc)}
            publishedAt={createdAt}
            categoryName={catName}
          />

          {/* Breadcrumb strip */}
          <div
            style={{ borderBottom: "1px solid var(--ty-border)", background: "var(--ty-bg-alt)" }}
          >
            <div className="ty-container">
              <nav aria-label="Breadcrumb">
                <ol
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    listStyle: "none",
                    padding: "0.75rem 0",
                    fontSize: "0.8rem",
                    color: "var(--ty-text-muted)",
                  }}
                >
                  <li>
                    <Link href="/" style={{ color: "var(--ty-text-muted)" }}>
                      Home
                    </Link>
                  </li>
                  <li aria-hidden="true" style={{ color: "var(--ty-text-faint)" }}>
                    ›
                  </li>
                  <li>
                    <Link href="/blog" style={{ color: "var(--ty-text-muted)" }}>
                      Journal
                    </Link>
                  </li>
                  {catName && (
                    <>
                      <li aria-hidden="true" style={{ color: "var(--ty-text-faint)" }}>
                        ›
                      </li>
                      <li style={{ color: "var(--ty-text-muted)" }}>{catName}</li>
                    </>
                  )}
                  <li aria-hidden="true" style={{ color: "var(--ty-text-faint)" }}>
                    ›
                  </li>
                  <li style={{ color: "var(--ty-text)" }} aria-current="page">
                    {title}
                  </li>
                </ol>
              </nav>
            </div>
          </div>

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
              <article>
                {bodyHtml ? <ArticleBody html={bodyHtml} /> : null}
                {blocks.length > 0 && (
                  <div style={{ marginTop: "3rem" }}>{renderBlocks(blocks, blocksRegistry)}</div>
                )}
              </article>

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
                  {authorName(doc) && (
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
                        {authorName(doc)}
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
                        Created
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
        </>
      ) : (
        /* Pages collection — simpler prose layout */
        <main style={{ padding: "4rem 1.5rem 5rem" }}>
          <div className="ty-container" style={{ maxWidth: "760px" }}>
            <h1
              style={{
                fontFamily: "var(--ty-font-head)",
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                marginBottom: "2rem",
              }}
            >
              {title}
            </h1>
            {bodyHtml ? (
              <div className="ty-prose" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            ) : null}
            {blocks.length > 0 && (
              <div style={{ marginTop: "3rem" }}>{renderBlocks(blocks, blocksRegistry)}</div>
            )}
          </div>
        </main>
      )}

      <SiteFooter />
    </>
  );
}
