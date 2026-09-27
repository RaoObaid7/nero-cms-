/**
 * SEO-105: Readability and link analysis.
 *
 * Readability: Flesch Reading Ease (English). Score boundaries:
 *   ≥70 easy, 60-69 fairly easy, 30-59 medium, <30 difficult.
 */

import type { ExtractedContent } from "./textExtraction";

export type ReadabilityLabel = "easy" | "fairly-easy" | "medium" | "difficult";

export interface ReadabilityResult {
  score: number;
  label: ReadabilityLabel;
}

export interface LinkResult {
  internalCount: number;
  externalCount: number;
  imagesWithoutAlt: number;
}

export interface DuplicateKeywordResult {
  duplicates: string[];
}

function sentenceCount(text: string): number {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [];
  return Math.max(sentences.length, 1);
}

function syllableCount(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const m = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const syl = m.match(/[aeiouy]{1,2}/g);
  return Math.max(syl ? syl.length : 1, 1);
}

export function analyzeReadability(body: string): ReadabilityResult {
  const words = body.trim().split(/\s+/).filter(Boolean);
  if (words.length < 10) return { score: 0, label: "difficult" };

  const sentences = sentenceCount(body);
  const totalSyllables = words.reduce((sum, w) => sum + syllableCount(w), 0);
  const avgWordsPerSentence = words.length / sentences;
  const avgSyllablesPerWord = totalSyllables / words.length;

  // Flesch Reading Ease formula
  const raw = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  const score = Math.round(Math.min(100, Math.max(0, raw)));

  let label: ReadabilityLabel;
  if (score >= 70) label = "easy";
  else if (score >= 60) label = "fairly-easy";
  else if (score >= 30) label = "medium";
  else label = "difficult";

  return { score, label };
}

export function analyzeLinks(extracted: ExtractedContent): LinkResult {
  let internalCount = 0;
  let externalCount = 0;

  for (const link of extracted.links) {
    if (link.url.startsWith("http://") || link.url.startsWith("https://")) {
      externalCount++;
    } else {
      internalCount++;
    }
  }

  const imagesWithoutAlt = extracted.images.filter(
    (img) => !img.alt || img.alt.trim() === "",
  ).length;

  return { internalCount, externalCount, imagesWithoutAlt };
}

export function findDuplicateKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const kw of keywords) {
    const norm = kw.toLowerCase().trim();
    if (!norm) continue;
    if (seen.has(norm)) duplicates.add(norm);
    seen.add(norm);
  }

  return [...duplicates];
}
