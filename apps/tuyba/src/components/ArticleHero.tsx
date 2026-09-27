import type { BlockMedia } from "@nero/ui";
import styles from "./ArticleHero.module.css";

export interface ArticleHeroProps {
  title: string;
  excerpt?: string | null;
  coverImage?: BlockMedia | null;
  authorName?: string | null;
  publishedAt?: string | null;
  categoryName?: string | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function ArticleHero({
  title,
  excerpt,
  coverImage,
  authorName,
  publishedAt,
  categoryName,
}: ArticleHeroProps) {
  const hasMetadata = authorName ?? publishedAt;

  return (
    <section className={styles.hero} aria-label="Article header">
      <div className={styles.glow} aria-hidden="true" />

      <div className={styles.grid}>
        {/* Left — spans both grid rows */}
        <div className={styles.textCell}>
          {categoryName && <span className={styles.categoryPill}>{categoryName}</span>}
          <h1 className={styles.title}>{title}</h1>
          {excerpt && <p className={styles.excerpt}>{excerpt}</p>}
        </div>

        {/* Top-right — cover image */}
        {coverImage?.url ? (
          <div className={styles.imageCell}>
            <img
              className={styles.coverImage}
              src={coverImage.url}
              alt={coverImage.alt ?? ""}
              width={coverImage.width}
              height={coverImage.height}
            />
            <div className={styles.imageOverlay} aria-hidden="true" />
          </div>
        ) : (
          <div className={styles.imagePlaceholder} aria-hidden="true" />
        )}

        {/* Bottom-right — glassmorphic metadata card */}
        {hasMetadata && (
          <div className={styles.metaCard}>
            {authorName && (
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Written by</span>
                <span className={styles.metaValue}>{authorName}</span>
              </div>
            )}
            {publishedAt && (
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Published</span>
                <time className={styles.metaValue} dateTime={publishedAt}>
                  {formatDate(publishedAt)}
                </time>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
