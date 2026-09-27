/**
 * SEO-121: Redirect import parsers for Yoast and SEOPress CSV formats.
 *
 * Both parsers are dry-run safe: they return structured rows without
 * touching the database. The caller decides whether to persist.
 */

export interface ParsedRedirect {
  from: string;
  to: string;
  type: "301" | "302" | "307";
}

export class RedirectParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RedirectParseError";
  }
}

function normalizePath(raw: string, siteUrl: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const base = new URL(siteUrl);
    const url = new URL(trimmed, base);
    if (url.hostname === base.hostname) return url.pathname;
    return trimmed;
  } catch {
    return trimmed;
  }
}

function mapType(raw: string): ParsedRedirect["type"] {
  const n = parseInt(raw.trim(), 10);
  if (n === 302) return "302";
  if (n === 307) return "307";
  return "301";
}

/**
 * Parses a Yoast Redirect Manager export CSV.
 * Expected columns (in order): old URL, new URL, type (optional).
 */
export function parseYoastRedirectCsv(csv: string, siteUrl = ""): ParsedRedirect[] {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) throw new RedirectParseError("CSV is empty.");

  const results: ParsedRedirect[] = [];
  for (const line of lines) {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const from = normalizePath(cols[0] ?? "", siteUrl);
    const to = normalizePath(cols[1] ?? "", siteUrl);
    if (!from || !to) continue;
    const type = mapType(cols[2] ?? "301");
    results.push({ from, to, type });
  }

  return results;
}

/**
 * Parses an SEOPress redirect export CSV.
 * SEOPress format: old URL, new URL, status code — same as Yoast but may
 * include a header row starting with "URL" which is skipped.
 */
export function parseSeoPressCsv(csv: string, siteUrl = ""): ParsedRedirect[] {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) throw new RedirectParseError("CSV is empty.");

  const start = lines[0]?.toLowerCase().startsWith("url") ? 1 : 0;
  return parseYoastRedirectCsv(lines.slice(start).join("\n"), siteUrl);
}
