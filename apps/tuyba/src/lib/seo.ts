import type { Metadata } from "next";

/** SEO-101/102: content-type default template. Per-document overrides win when present. */
export const SITE_NAME = "TUYBA";

export interface SeoOverrides {
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  noindex?: boolean | null;
  nofollow?: boolean | null;
  ogImage?: { url?: string | null } | null;
}

export interface BuildMetadataArgs {
  title: string;
  fallbackDescription?: string | null;
  /** Site-relative path, e.g. `/about` or `/blog/my-post`. */
  path: string;
  seo?: SeoOverrides | null;
  coverImageUrl?: string | null;
  serverURL: string;
}

/**
 * SEO-101 (per-document title/description with a content-type default) and
 * SEO-102 (canonical, robots directives, Open Graph / Twitter cards) in one
 * place, so every public route builds metadata the same way.
 */
export function buildMetadata(args: BuildMetadataArgs): Metadata {
  const { title, fallbackDescription, path, seo, coverImageUrl, serverURL } = args;

  const resolvedTitle = seo?.metaTitle || `${title} | ${SITE_NAME}`;
  const resolvedDescription = seo?.metaDescription || fallbackDescription || undefined;
  const canonical = seo?.canonicalUrl || `${serverURL}${path}`;
  const noindex = Boolean(seo?.noindex);
  const nofollow = Boolean(seo?.nofollow);
  const imageUrl = seo?.ogImage?.url || coverImageUrl || undefined;

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    alternates: { canonical },
    robots: {
      index: !noindex,
      follow: !nofollow,
    },
    openGraph: {
      title: resolvedTitle,
      description: resolvedDescription,
      url: canonical,
      siteName: SITE_NAME,
      type: "website",
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: resolvedTitle,
      description: resolvedDescription,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

/** SEO-103: breadcrumb markup, shared by the visible breadcrumb trail and its JSON-LD twin. */
export function breadcrumbSchema(items: BreadcrumbItem[], serverURL: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${serverURL}${item.path}`,
    })),
  };
}

export function organizationSchema(serverURL: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: serverURL,
  };
}

export function websiteSchema(serverURL: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: serverURL,
  };
}

export interface ArticleSchemaArgs {
  title: string;
  description?: string | null;
  path: string;
  serverURL: string;
  datePublished?: string | null;
  dateModified?: string | null;
  imageUrl?: string | null;
  authorName?: string | null;
}

/** SEO-112: Article/BlogPosting preset. */
export function articleSchema(args: ArticleSchemaArgs) {
  const { title, description, path, serverURL, datePublished, dateModified, imageUrl, authorName } =
    args;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description: description || undefined,
    url: `${serverURL}${path}`,
    image: imageUrl || undefined,
    datePublished: datePublished || undefined,
    dateModified: dateModified || datePublished || undefined,
    author: authorName ? { "@type": "Person", name: authorName } : undefined,
    publisher: organizationSchema(serverURL),
  };
}
