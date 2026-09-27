/**
 * SEO-104: Keyword analysis — presence, density, slug length and heading checks.
 */

import type { ExtractedContent } from "./textExtraction";

export interface KeywordResult {
  keyword: string;
  presentInTitle: boolean;
  presentInDescription: boolean;
  presentInSlug: boolean;
  presentInFirstHeading: boolean;
  presentInBody: boolean;
  densityPercent: number;
  wordCount: number;
  slugLength: number;
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(text: string): number {
  const t = normalise(text);
  return t === "" ? 0 : t.split(" ").length;
}

function containsKeyword(text: string, keyword: string): boolean {
  const n = normalise(text);
  const k = normalise(keyword);
  return k !== "" && n.includes(k);
}

function densityPercent(text: string, keyword: string): number {
  const words = normalise(text).split(" ").filter(Boolean);
  if (words.length === 0) return 0;
  const kw = normalise(keyword).split(" ").filter(Boolean);
  if (kw.length === 0) return 0;

  let matches = 0;
  for (let i = 0; i <= words.length - kw.length; i++) {
    if (kw.every((w, j) => words[i + j] === w)) matches++;
  }
  return Math.round((matches / words.length) * 100 * 10) / 10;
}

export function analyzeKeywords(extracted: ExtractedContent, keyword: string): KeywordResult {
  const wc = wordCount(extracted.body);
  const density = densityPercent(`${extracted.title} ${extracted.body}`, keyword);

  return {
    keyword,
    presentInTitle: containsKeyword(extracted.title, keyword),
    presentInDescription: containsKeyword(extracted.excerpt, keyword),
    presentInSlug: containsKeyword(extracted.slug.replace(/-/g, " "), keyword),
    presentInFirstHeading:
      extracted.headings.length > 0 && containsKeyword(extracted.headings[0] ?? "", keyword),
    presentInBody: containsKeyword(extracted.body, keyword),
    densityPercent: density,
    wordCount: wc,
    slugLength: extracted.slug.length,
  };
}
