/**
 * SEO-104/105: Text extraction from Payload documents.
 *
 * Walks title, excerpt, slug, Lexical rich-text body and every block in the
 * layout array to produce a normalized flat text representation for analysis.
 * Pure function; no database access.
 */

export interface ExtractedLink {
  url: string;
  text: string;
}

export interface ExtractedImage {
  url: string;
  alt?: string;
}

export interface ExtractedContent {
  title: string;
  excerpt: string;
  slug: string;
  headings: string[];
  /** Full body text, whitespace-normalized. */
  body: string;
  links: ExtractedLink[];
  images: ExtractedImage[];
}

// ─── Lexical helpers ──────────────────────────────────────────────────────────

function extractLexicalText(
  node: unknown,
  acc: { text: string; links: ExtractedLink[]; headings: string[] },
): void {
  if (!node || typeof node !== "object") return;
  const n = node as Record<string, unknown>;

  if (n.type === "heading" && Array.isArray(n.children)) {
    const heading = n.children
      .map((c) =>
        typeof (c as Record<string, unknown>).text === "string"
          ? (c as Record<string, unknown>).text
          : "",
      )
      .join("")
      .trim();
    if (heading) acc.headings.push(heading);
    acc.text += " " + heading;
  } else if (n.type === "link" && Array.isArray(n.children)) {
    const linkText = n.children
      .map((c) =>
        typeof (c as Record<string, unknown>).text === "string"
          ? (c as Record<string, unknown>).text
          : "",
      )
      .join("")
      .trim();
    const url = typeof n.url === "string" ? n.url : "";
    if (linkText && url) acc.links.push({ url, text: linkText });
    acc.text += " " + linkText;
  } else if (typeof n.text === "string") {
    acc.text += " " + n.text;
  } else if (Array.isArray(n.children)) {
    for (const child of n.children) extractLexicalText(child, acc);
  } else if (n.root && typeof n.root === "object") {
    extractLexicalText(n.root, acc);
  }
}

function fromLexical(lexical: unknown): {
  text: string;
  links: ExtractedLink[];
  headings: string[];
} {
  const acc = { text: "", links: [] as ExtractedLink[], headings: [] as string[] };
  extractLexicalText(lexical, acc);
  return acc;
}

// ─── Block helpers ────────────────────────────────────────────────────────────

function blockText(block: Record<string, unknown>): {
  text: string;
  links: ExtractedLink[];
  images: ExtractedImage[];
  headings: string[];
} {
  const text: string[] = [];
  const links: ExtractedLink[] = [];
  const images: ExtractedImage[] = [];
  const headings: string[] = [];

  function str(v: unknown): string {
    return typeof v === "string" ? v : "";
  }

  switch (block.blockType) {
    case "hero": {
      const heading = str(block.heading);
      if (heading) headings.push(heading);
      text.push(heading, str(block.subheading));
      const ctaLabel = str((block.cta as Record<string, unknown>)?.label);
      if (ctaLabel && (block.cta as Record<string, unknown>)?.href) {
        links.push({ url: str((block.cta as Record<string, unknown>).href), text: ctaLabel });
      }
      break;
    }
    case "richText": {
      const r = fromLexical(block.content);
      text.push(r.text);
      links.push(...r.links);
      headings.push(...r.headings);
      break;
    }
    case "imageText": {
      const r = fromLexical(block.content);
      text.push(r.text);
      links.push(...r.links);
      const media = block.media as Record<string, unknown> | null | undefined;
      if (media?.url) images.push({ url: str(media.url), alt: str(media.alt) });
      break;
    }
    case "gallery": {
      const items = Array.isArray(block.items) ? block.items : [];
      for (const item of items) {
        const it = item as Record<string, unknown>;
        const media = it.media as Record<string, unknown> | null | undefined;
        if (media?.url)
          images.push({ url: str(media.url), alt: str(media.alt) || str(it.caption) });
        if (it.caption) text.push(str(it.caption));
      }
      break;
    }
    case "callout": {
      text.push(str(block.text));
      break;
    }
    case "contentCards": {
      const cards = Array.isArray(block.cards) ? block.cards : [];
      for (const card of cards) {
        const c = card as Record<string, unknown>;
        text.push(str(c.title), str(c.summary));
        if (c.href) links.push({ url: str(c.href), text: str(c.title) });
        const media = c.media as Record<string, unknown> | null | undefined;
        if (media?.url) images.push({ url: str(media.url), alt: str(media.alt) });
      }
      break;
    }
    case "faq": {
      const items = Array.isArray(block.items) ? block.items : [];
      for (const item of items) {
        const it = item as Record<string, unknown>;
        text.push(str(it.question), str(it.answer));
      }
      break;
    }
    case "cta": {
      const ctaHeading = str(block.heading);
      if (ctaHeading) headings.push(ctaHeading);
      text.push(ctaHeading, str(block.body));
      const actions = Array.isArray(block.actions) ? block.actions : [];
      for (const action of actions) {
        const a = action as Record<string, unknown>;
        if (a.href) links.push({ url: str(a.href), text: str(a.label) });
      }
      break;
    }
    default:
      // Unknown block: extract any string fields we can find at top level
      for (const val of Object.values(block)) {
        if (typeof val === "string") text.push(val);
      }
  }

  return { text: text.join(" "), links, images, headings };
}

// ─── Main extraction function ─────────────────────────────────────────────────

/**
 * Extracts a normalized content snapshot from a Pages or Articles document.
 * The document shape matches what Payload returns after `depth: 1` population.
 */
export function extractDocumentText(doc: Record<string, unknown>): ExtractedContent {
  const title =
    typeof doc.title === "string" ? doc.title : typeof doc.name === "string" ? doc.name : "";
  const excerpt = typeof doc.excerpt === "string" ? doc.excerpt : "";
  const slug = typeof doc.slug === "string" ? doc.slug : "";

  const allLinks: ExtractedLink[] = [];
  const allImages: ExtractedImage[] = [];
  const allHeadings: string[] = [];
  const bodyParts: string[] = [];

  // Lexical body (articles)
  if (doc.body) {
    const r = fromLexical(doc.body);
    bodyParts.push(r.text);
    allLinks.push(...r.links);
    allHeadings.push(...r.headings);
  }

  // Lexical content (pages)
  if (doc.content) {
    const r = fromLexical(doc.content);
    bodyParts.push(r.text);
    allLinks.push(...r.links);
    allHeadings.push(...r.headings);
  }

  // Block layout
  if (Array.isArray(doc.layout)) {
    for (const block of doc.layout) {
      const b = blockText(block as Record<string, unknown>);
      bodyParts.push(b.text);
      allLinks.push(...b.links);
      allImages.push(...b.images);
      allHeadings.push(...b.headings);
    }
  }

  // Cover image
  const cover = doc.coverImage as Record<string, unknown> | null | undefined;
  if (cover?.url)
    allImages.push({
      url: String(cover.url),
      alt: typeof cover.alt === "string" ? cover.alt : undefined,
    });

  const body = bodyParts.join(" ").replace(/\s+/g, " ").trim();

  return { title, excerpt, slug, headings: allHeadings, body, links: allLinks, images: allImages };
}
