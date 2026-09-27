/**
 * SEO-112 completion: structural JSON-LD validation.
 *
 * Checks that `@context`, `@type` and required fields for each supported type
 * are present. Returns a list of human-readable error strings (empty = valid).
 * Does not make network calls — structural only, not vocabulary validation.
 *
 * Supported types: Article, BlogPosting, NewsArticle, BreadcrumbList,
 * Organization, Person, WebSite, LocalBusiness, FAQPage, VideoObject,
 * PodcastSeries, PodcastEpisode.
 */

type SchemaErrors = string[];

const SUPPORTED_TYPES = [
  "Article",
  "BlogPosting",
  "NewsArticle",
  "BreadcrumbList",
  "Organization",
  "Person",
  "WebSite",
  "LocalBusiness",
  "FAQPage",
  "VideoObject",
  "PodcastSeries",
  "PodcastEpisode",
] as const;

export type SupportedSchemaType = (typeof SUPPORTED_TYPES)[number];

const REQUIRED_FIELDS: Record<SupportedSchemaType, string[]> = {
  Article: ["headline", "url"],
  BlogPosting: ["headline", "url"],
  NewsArticle: ["headline", "url", "datePublished"],
  BreadcrumbList: ["itemListElement"],
  Organization: ["name", "url"],
  Person: ["name"],
  WebSite: ["name", "url"],
  LocalBusiness: ["name"],
  FAQPage: ["mainEntity"],
  VideoObject: ["name", "description", "thumbnailUrl", "uploadDate"],
  PodcastSeries: ["name"],
  PodcastEpisode: ["name", "associatedMedia"],
};

export function validateJsonLd(schema: unknown): SchemaErrors {
  const errors: SchemaErrors = [];

  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    errors.push("Schema must be a JSON object.");
    return errors;
  }

  const obj = schema as Record<string, unknown>;

  if (!obj["@context"]) {
    errors.push('Missing required field: "@context". Set it to "https://schema.org".');
  } else if (
    typeof obj["@context"] !== "string" ||
    !String(obj["@context"]).includes("schema.org")
  ) {
    errors.push('"@context" should be "https://schema.org" or "http://schema.org".');
  }

  const type = obj["@type"];
  if (!type) {
    errors.push('Missing required field: "@type".');
    return errors;
  }

  if (typeof type !== "string") {
    errors.push('"@type" must be a string.');
    return errors;
  }

  const supported = SUPPORTED_TYPES.includes(type as SupportedSchemaType);
  if (!supported) {
    // Not a validation error — custom types are allowed; just no field checks.
    return errors;
  }

  const required = REQUIRED_FIELDS[type as SupportedSchemaType];
  for (const field of required) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === "") {
      errors.push(`Missing required field for ${type}: "${field}".`);
    }
  }

  return errors;
}

export function isSupportedSchemaType(type: string): type is SupportedSchemaType {
  return SUPPORTED_TYPES.includes(type as SupportedSchemaType);
}
