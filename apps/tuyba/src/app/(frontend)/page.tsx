import Link from "next/link";
import { contentClient } from "@/lib/content-client";
import { articlePath } from "@/lib/urls";
import { Navbar } from "@/components/Navbar";
import { ArticleCard } from "@/components/ArticleCard";
import { SiteFooter } from "@/components/SiteFooter";

export const dynamic = "force-dynamic";

const STATS = [
  { value: "400+", label: "Halal hotels listed" },
  { value: "12+", label: "Countries covered" },
  { value: "Weekly", label: "New articles" },
  { value: "100%", label: "Family-friendly" },
];

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <path
          d="M11 2L13.09 8.26L20 9.27L15 14.14L16.18 21.02L11 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L11 2Z"
          stroke="#059669"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Verified Halal Certified",
    desc: "Every property is reviewed against our 40-point suitability checklist before listing.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <path d="M17 10c0 5-6 9-6 9s-6-4-6-9a6 6 0 1 1 12 0z" stroke="#059669" strokeWidth="1.8" />
        <circle cx="11" cy="10" r="2" stroke="#059669" strokeWidth="1.8" />
      </svg>
    ),
    title: "Prayer & Qibla Info",
    desc: "Prayer times, nearby mosques and Qibla direction integrated for every destination.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <path
          d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"
          stroke="#059669"
          strokeWidth="1.8"
        />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="#059669" strokeWidth="1.8" />
        <line
          x1="11"
          y1="12"
          x2="11"
          y2="12"
          stroke="#059669"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
    title: "Family Room Filters",
    desc: "Interconnecting rooms, kid-friendly facilities and alcohol-free floors in one filter.",
  },
];

function getPrimaryCategory(article: Record<string, unknown>): string | undefined {
  const cat = article.primaryCategory;
  if (!cat || typeof cat !== "object") return undefined;
  const c = cat as Record<string, unknown>;
  return typeof c.name === "string" ? c.name : undefined;
}

export default async function HomePage() {
  const { docs: articles } = await contentClient.getArticles({ limit: 6 });

  return (
    <>
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f2a1e 100%)",
          color: "var(--ty-text-inverse)",
          padding: "5rem 1.5rem 6rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `radial-gradient(circle at 20% 50%, rgba(5,150,105,0.15) 0%, transparent 60%),
                             radial-gradient(circle at 80% 20%, rgba(5,150,105,0.1) 0%, transparent 50%)`,
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            pointerEvents: "none",
          }}
        />

        <div className="ty-container" style={{ position: "relative", maxWidth: "760px" }}>
          <div className="ty-anim-1" style={{ marginBottom: "1.5rem" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.35rem 0.9rem",
                borderRadius: "9999px",
                background: "rgba(5,150,105,0.2)",
                border: "1px solid rgba(5,150,105,0.4)",
                color: "#6ee7b7",
                fontSize: "0.8rem",
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="#6ee7b7" aria-hidden="true">
                <circle cx="4" cy="4" r="4" />
              </svg>
              Halal Travel · Curated Guides
            </span>
          </div>

          <h1
            className="ty-anim-2"
            style={{
              fontFamily: "var(--ty-font-head)",
              fontSize: "clamp(2.4rem, 5vw, 3.75rem)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              marginBottom: "1.5rem",
              color: "#f8fafc",
            }}
          >
            Travel that{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #34d399, #059669)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              respects
            </span>
            <br />
            your values.
          </h1>

          <p
            className="ty-anim-3"
            style={{
              fontSize: "1.15rem",
              color: "#94a3b8",
              lineHeight: 1.7,
              maxWidth: "54ch",
              marginBottom: "2.5rem",
            }}
          >
            Halal-certified stays, verified prayer facilities and family-first filters — all the
            guidance you need for meaningful Muslim travel.
          </p>

          <div className="ty-anim-4" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/blog" className="ty-btn-primary">
              Browse articles
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M3 8h10M9 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <Link href="/admin" className="ty-btn-ghost-dark">
              Manage content
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ─────────────────────────────────────────────────────── */}
      <section
        style={{
          background: "var(--ty-bg-dark-2)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="ty-container"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          }}
        >
          {STATS.map((s, i) => (
            <div
              key={i}
              style={{
                padding: "1.25rem 1.5rem",
                borderRight: i < STATS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--ty-font-head)",
                  fontWeight: 800,
                  fontSize: "1.5rem",
                  color: "#34d399",
                  letterSpacing: "-0.03em",
                }}
              >
                {s.value}
              </p>
              <p style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.2rem" }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section style={{ padding: "5rem 1.5rem", background: "var(--ty-bg-alt)" }}>
        <div className="ty-container">
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <p
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--ty-accent)",
                marginBottom: "0.5rem",
              }}
            >
              Why TUYBA
            </p>
            <h2
              style={{
                fontFamily: "var(--ty-font-head)",
                fontSize: "clamp(1.75rem, 3vw, 2.4rem)",
                letterSpacing: "-0.03em",
                color: "var(--ty-text)",
              }}
            >
              Built for Muslim travellers
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {FEATURES.map((f, i) => (
              <div key={i} className="ty-feature-card">
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    background: "var(--ty-accent-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {f.icon}
                </div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--ty-text)" }}>
                  {f.title}
                </h3>
                <p
                  style={{ fontSize: "0.875rem", color: "var(--ty-text-muted)", lineHeight: 1.65 }}
                >
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Latest Articles ───────────────────────────────────────────────── */}
      <section style={{ padding: "5rem 1.5rem" }}>
        <div className="ty-container">
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem",
              marginBottom: "2.5rem",
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
              <h2
                style={{
                  fontFamily: "var(--ty-font-head)",
                  fontSize: "clamp(1.75rem, 3vw, 2.2rem)",
                  letterSpacing: "-0.03em",
                }}
              >
                Latest from the blog
              </h2>
            </div>
            <Link href="/blog" className="ty-btn-outline-accent">
              View all articles
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

          {articles.length === 0 ? (
            <div
              style={{
                padding: "4rem 2rem",
                textAlign: "center",
                border: "2px dashed var(--ty-border)",
                borderRadius: "var(--ty-radius-lg)",
                color: "var(--ty-text-muted)",
              }}
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                fill="none"
                style={{ margin: "0 auto 1rem" }}
                aria-hidden="true"
              >
                <rect
                  x="6"
                  y="8"
                  width="28"
                  height="24"
                  rx="3"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                />
                <line
                  x1="12"
                  y1="15"
                  x2="28"
                  y2="15"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="12"
                  y1="20"
                  x2="22"
                  y2="20"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <p
                style={{
                  fontFamily: "var(--ty-font-head)",
                  fontWeight: 600,
                  fontSize: "1.05rem",
                  marginBottom: "0.5rem",
                }}
              >
                No articles yet
              </p>
              <p style={{ fontSize: "0.875rem" }}>
                Run{" "}
                <code
                  style={{
                    background: "#f1f5f9",
                    padding: "0.15rem 0.4rem",
                    borderRadius: "4px",
                    fontSize: "0.8rem",
                  }}
                >
                  pnpm seed:articles
                </code>{" "}
                or{" "}
                <Link
                  href="/admin/collections/articles"
                  style={{ color: "var(--ty-accent)", fontWeight: 600 }}
                >
                  create one in the admin
                </Link>
                .
              </p>
            </div>
          ) : (
            <>
              {articles.length >= 3 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(12, 1fr)",
                    gap: "1.25rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  <div style={{ gridColumn: "1 / 7" }}>
                    <ArticleCard
                      slug={articles[0]!.slug}
                      title={articles[0]!.title}
                      excerpt={
                        typeof (articles[0] as Record<string, unknown>).excerpt === "string"
                          ? ((articles[0] as Record<string, unknown>).excerpt as string)
                          : undefined
                      }
                      categoryName={getPrimaryCategory(articles[0] as Record<string, unknown>)}
                      isPodcast={Boolean((articles[0] as Record<string, unknown>).isPodcastEpisode)}
                      isNews={Boolean((articles[0] as Record<string, unknown>).newsArticle)}
                      href={articlePath(articles[0]!.slug)}
                      size="large"
                    />
                  </div>
                  <div
                    style={{
                      gridColumn: "7 / 13",
                      display: "grid",
                      gridTemplateRows: "1fr 1fr",
                      gap: "1.25rem",
                    }}
                  >
                    {[articles[1], articles[2]].filter(Boolean).map((a) => (
                      <ArticleCard
                        key={a!.id}
                        slug={a!.slug}
                        title={a!.title}
                        excerpt={
                          typeof (a as Record<string, unknown>).excerpt === "string"
                            ? ((a as Record<string, unknown>).excerpt as string)
                            : undefined
                        }
                        categoryName={getPrimaryCategory(a as Record<string, unknown>)}
                        isPodcast={Boolean((a as Record<string, unknown>).isPodcastEpisode)}
                        isNews={Boolean((a as Record<string, unknown>).newsArticle)}
                        href={articlePath(a!.slug)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {articles.slice(articles.length >= 3 ? 3 : 0).length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: "1.25rem",
                  }}
                >
                  {articles.slice(articles.length >= 3 ? 3 : 0).map((a) => (
                    <ArticleCard
                      key={a.id}
                      slug={a.slug}
                      title={a.title}
                      excerpt={
                        typeof (a as Record<string, unknown>).excerpt === "string"
                          ? ((a as Record<string, unknown>).excerpt as string)
                          : undefined
                      }
                      categoryName={getPrimaryCategory(a as Record<string, unknown>)}
                      isPodcast={Boolean((a as Record<string, unknown>).isPodcastEpisode)}
                      isNews={Boolean((a as Record<string, unknown>).newsArticle)}
                      href={articlePath(a.slug)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────────── */}
      <section
        style={{
          margin: "0 1.5rem 4rem",
          background: "linear-gradient(135deg, var(--ty-bg-dark) 0%, #0f2a1e 100%)",
          borderRadius: "var(--ty-radius-lg)",
          padding: "3.5rem 2.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "2rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            right: "-60px",
            top: "-60px",
            width: "240px",
            height: "240px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(5,150,105,0.2) 0%, transparent 70%)",
          }}
        />
        <div style={{ position: "relative" }}>
          <h2
            style={{
              fontFamily: "var(--ty-font-head)",
              fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)",
              fontWeight: 800,
              color: "#f8fafc",
              letterSpacing: "-0.03em",
              marginBottom: "0.5rem",
            }}
          >
            Ready to manage your content?
          </h2>
          <p style={{ color: "#64748b", fontSize: "0.95rem", maxWidth: "44ch" }}>
            The full editorial suite is live — articles, SEO analysis, redirects, GTM and more.
          </p>
        </div>
        <Link href="/admin" className="ty-btn-cta">
          Open Admin
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M3 8h10M9 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </section>

      <SiteFooter />
    </>
  );
}
