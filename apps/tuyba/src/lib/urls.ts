/**
 * The one place that knows TUYBA's public URL shape for content: a page
 * lives at its bare slug, an article lives under `/blog/`. Both the routes
 * and `payload.config.ts` (for cache-tag/redirect wiring) import from here so
 * the two never drift apart.
 */
export function pagePath(slug: string): string {
  return `/${slug}`;
}

export function articlePath(slug: string): string {
  return `/blog/${slug}`;
}

export function categoryPath(slug: string): string {
  return `/category/${slug}`;
}
