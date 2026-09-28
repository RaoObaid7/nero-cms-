import Link from "next/link";

interface ArticleCardProps {
  slug: string;
  title: string;
  excerpt?: string;
  coverImage?: { url: string; alt?: string };
  categoryName?: string;
  isPodcast?: boolean;
  isNews?: boolean;
  href: string;
  size?: "normal" | "large";
}

export function ArticleCard({
  title,
  excerpt,
  coverImage,
  categoryName,
  isPodcast,
  isNews,
  href,
  size = "normal",
}: ArticleCardProps) {
  const isLarge = size === "large";

  return (
    <article className="ty-article-card" style={{ padding: isLarge ? "2rem" : "1.5rem" }}>
      {coverImage && (
        <img
          src={coverImage.url}
          alt={coverImage.alt ?? ""}
          loading="lazy"
          style={{
            width: "100%",
            aspectRatio: "16 / 9",
            objectFit: "cover",
            borderRadius: "var(--ty-radius-sm)",
          }}
        />
      )}

      {/* Badges */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {categoryName && (
          <span
            style={{
              display: "inline-block",
              padding: "0.2rem 0.6rem",
              borderRadius: "9999px",
              background: "var(--ty-accent-light)",
              color: "var(--ty-accent-hover)",
              fontSize: "0.72rem",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {categoryName}
          </span>
        )}
        {isPodcast && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.2rem 0.6rem",
              borderRadius: "9999px",
              background: "#f3e8ff",
              color: "#7c3aed",
              fontSize: "0.72rem",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="5" r="2" />
              <path d="M5 1a4 4 0 0 1 0 8" stroke="currentColor" strokeWidth="1" fill="none" />
            </svg>
            Podcast
          </span>
        )}
        {isNews && (
          <span
            style={{
              padding: "0.2rem 0.6rem",
              borderRadius: "9999px",
              background: "#fef3c7",
              color: "#92400e",
              fontSize: "0.72rem",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            News
          </span>
        )}
      </div>

      <Link href={href}>
        <h3 style={{ fontSize: isLarge ? "1.35rem" : "1.05rem" }}>{title}</h3>
      </Link>

      {excerpt && (
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--ty-text-muted)",
            lineHeight: 1.65,
            display: "-webkit-box",
            WebkitLineClamp: isLarge ? 4 : 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            flex: 1,
          }}
        >
          {excerpt}
        </p>
      )}

      <Link href={href} className="ty-read-more">
        Read article
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
    </article>
  );
}
