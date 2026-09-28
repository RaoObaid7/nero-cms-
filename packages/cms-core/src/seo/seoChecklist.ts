/**
 * SEO-106: Explainable SEO checklist and score.
 *
 * Aggregates keyword, readability and link checks into labelled, explanatory
 * pass/warn/fail items. Score: 0-100 as a weighted count of passing checks.
 */

import type { ExtractedContent } from "./textExtraction";
import { analyzeKeywords } from "./keywordAnalysis";
import { analyzeReadability, analyzeLinks, findDuplicateKeywords } from "./readabilityAnalysis";

export type CheckStatus = "pass" | "warn" | "fail";

export interface SeoCheckItem {
  id: string;
  label: string;
  description: string;
  status: CheckStatus;
}

export interface SeoChecklist {
  items: SeoCheckItem[];
  /** 0–100 weighted score; passing checks contribute; warnings count half. */
  score: number;
}

export interface InternalLinkSuggestion {
  id: string | number;
  title: string;
  slug: string;
  sharedTaxonomyCount: number;
}

function check(
  id: string,
  label: string,
  status: CheckStatus,
  passDesc: string,
  failDesc: string,
  warnDesc?: string,
): SeoCheckItem {
  const description =
    status === "pass" ? passDesc : status === "warn" ? (warnDesc ?? failDesc) : failDesc;
  return { id, label, description, status };
}

export function buildSeoChecklist(extracted: ExtractedContent, keywords: string[]): SeoChecklist {
  const items: SeoCheckItem[] = [];

  const primaryKeyword = keywords[0] ?? "";

  // Keyword checks
  if (primaryKeyword) {
    const kw = analyzeKeywords(extracted, primaryKeyword);

    items.push(
      check(
        "kw-in-title",
        "Keyword in title",
        kw.presentInTitle ? "pass" : "fail",
        `The focus keyword "${primaryKeyword}" appears in the title.`,
        `The focus keyword "${primaryKeyword}" is missing from the title.`,
      ),
    );
    items.push(
      check(
        "kw-in-description",
        "Keyword in meta description",
        kw.presentInDescription ? "pass" : "warn",
        `The focus keyword appears in the excerpt/description.`,
        `Consider adding the focus keyword to the excerpt/description.`,
      ),
    );
    items.push(
      check(
        "kw-in-slug",
        "Keyword in URL",
        kw.presentInSlug ? "pass" : "warn",
        `The focus keyword appears in the URL slug.`,
        `Consider including the focus keyword in the URL slug.`,
      ),
    );
    items.push(
      check(
        "kw-in-heading",
        "Keyword in first heading",
        kw.presentInFirstHeading ? "pass" : "warn",
        `The focus keyword appears in the first heading.`,
        `The focus keyword is missing from the first heading.`,
      ),
    );
    items.push(
      check(
        "kw-in-body",
        "Keyword in body text",
        kw.presentInBody ? "pass" : "fail",
        `The focus keyword appears in the body text.`,
        `The focus keyword "${primaryKeyword}" does not appear in the body text.`,
      ),
    );

    const density = kw.densityPercent;
    items.push(
      check(
        "kw-density",
        "Keyword density",
        density >= 0.5 && density <= 3 ? "pass" : density < 0.5 ? "warn" : "warn",
        `Keyword density is ${density}% — within the recommended 0.5–3% range.`,
        density < 0.5
          ? `Keyword density is ${density}% — consider using the keyword a bit more.`
          : `Keyword density is ${density}% — consider reducing keyword repetition.`,
      ),
    );

    items.push(
      check(
        "word-count",
        "Word count",
        kw.wordCount >= 300 ? "pass" : kw.wordCount >= 100 ? "warn" : "fail",
        `${kw.wordCount} words — sufficient for indexing.`,
        `${kw.wordCount} words — aim for at least 300 words for most content types.`,
        `${kw.wordCount} words — consider expanding the content.`,
      ),
    );

    items.push(
      check(
        "slug-length",
        "URL slug length",
        kw.slugLength <= 75 ? "pass" : "warn",
        `Slug length is ${kw.slugLength} characters — within the recommended maximum.`,
        `Slug length is ${kw.slugLength} characters — consider shortening it to under 75 characters.`,
      ),
    );
  } else {
    items.push({
      id: "no-keyword",
      label: "Focus keyword",
      description: "No focus keyword set. Add one in the SEO settings.",
      status: "warn",
    });
  }

  // Duplicate keyword check
  if (keywords.length > 1) {
    const dupes = findDuplicateKeywords(keywords);
    items.push(
      check(
        "kw-duplicates",
        "Duplicate keywords",
        dupes.length === 0 ? "pass" : "warn",
        "No duplicate keywords detected.",
        `Duplicate keywords: ${dupes.join(", ")}. Consider using distinct terms.`,
      ),
    );
  }

  // Readability
  if (extracted.body.trim()) {
    const readability = analyzeReadability(extracted.body);
    items.push(
      check(
        "readability",
        "Readability",
        readability.label === "easy" || readability.label === "fairly-easy"
          ? "pass"
          : readability.label === "medium"
            ? "warn"
            : "fail",
        `Readability score: ${readability.score}/100 (${readability.label}). Easy to read.`,
        `Readability score: ${readability.score}/100 (${readability.label}). Consider simplifying sentences.`,
        `Readability score: ${readability.score}/100 (${readability.label}). Moderately readable.`,
      ),
    );
  }

  // Links
  const links = analyzeLinks(extracted);
  items.push(
    check(
      "internal-links",
      "Internal links",
      links.internalCount > 0 ? "pass" : "warn",
      `${links.internalCount} internal link(s) — good for site structure.`,
      "No internal links found. Add links to related content to improve navigation.",
    ),
  );

  items.push(
    check(
      "images-alt",
      "Image alt text",
      links.imagesWithoutAlt === 0 ? "pass" : "warn",
      "All images have alt text.",
      `${links.imagesWithoutAlt} image(s) are missing alt text. Add descriptive alt text for accessibility and SEO.`,
    ),
  );

  // Title length
  items.push(
    check(
      "title-length",
      "Title length",
      extracted.title.length >= 20 && extracted.title.length <= 70 ? "pass" : "warn",
      `Title is ${extracted.title.length} characters — good length for search results.`,
      `Title is ${extracted.title.length} characters — aim for 20–70 characters for best display in search results.`,
    ),
  );

  // Excerpt/description length
  items.push(
    check(
      "description-length",
      "Meta description length",
      extracted.excerpt.length >= 70 && extracted.excerpt.length <= 160
        ? "pass"
        : extracted.excerpt.length === 0
          ? "warn"
          : "warn",
      `Description is ${extracted.excerpt.length} characters — good length.`,
      `Description is ${extracted.excerpt.length} characters — aim for 70–160 characters.`,
    ),
  );

  // Compute score (pass=2, warn=1, fail=0 per item; max = items.length * 2)
  const maxScore = items.length * 2;
  const rawScore = items.reduce(
    (sum, item) => sum + (item.status === "pass" ? 2 : item.status === "warn" ? 1 : 0),
    0,
  );
  const score = maxScore > 0 ? Math.round((rawScore / maxScore) * 100) : 0;

  return { items, score };
}

/**
 * SEO-106: non-AI internal link suggestions. Returns published documents
 * that share at least one taxonomy term with the current document.
 */
export function suggestInternalLinks(
  currentDoc: { primaryCategory?: unknown; additionalCategories?: unknown; tags?: unknown },
  allPublishedDocs: Array<{
    id: string | number;
    title: string;
    slug: string;
    primaryCategory?: unknown;
    additionalCategories?: unknown;
    tags?: unknown;
  }>,
): InternalLinkSuggestion[] {
  function slugsOf(field: unknown): string[] {
    if (!field) return [];
    if (Array.isArray(field)) {
      return field.flatMap((f) => {
        const slug = (f as Record<string, unknown>)?.slug;
        return typeof slug === "string" ? [slug] : [];
      });
    }
    const slug = (field as Record<string, unknown>)?.slug;
    return typeof slug === "string" ? [slug] : [];
  }

  function tagsOf(field: unknown): string[] {
    if (typeof field === "string") {
      return field
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean);
    }
    return slugsOf(field);
  }

  const currentCategorySlugs = new Set([
    ...slugsOf(currentDoc.primaryCategory),
    ...slugsOf(currentDoc.additionalCategories),
  ]);
  const currentTags = new Set(tagsOf(currentDoc.tags));

  const suggestions: InternalLinkSuggestion[] = [];
  for (const doc of allPublishedDocs) {
    const docCats = new Set([
      ...slugsOf(doc.primaryCategory),
      ...slugsOf(doc.additionalCategories),
    ]);
    const docTags = new Set(tagsOf(doc.tags));

    let shared = 0;
    for (const s of docCats) if (currentCategorySlugs.has(s)) shared++;
    for (const s of docTags) if (currentTags.has(s)) shared++;

    if (shared > 0) {
      suggestions.push({
        id: doc.id,
        title: doc.title,
        slug: doc.slug,
        sharedTaxonomyCount: shared,
      });
    }
  }

  return suggestions.sort((a, b) => b.sharedTaxonomyCount - a.sharedTaxonomyCount).slice(0, 5);
}
