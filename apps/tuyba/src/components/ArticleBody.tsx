"use client";

import React, { useMemo } from "react";
import ScrollFAQAccordion, { type FAQItem } from "@/components/ui/scroll-faqaccordion";

interface ArticleBodyProps {
  html: string;
}

interface Segment {
  type: "html" | "faq";
  content?: string;
  items?: FAQItem[];
}

export function ArticleBody({ html }: ArticleBodyProps) {
  const segments = useMemo<Segment[]>(() => {
    if (!html) return [];

    // Match paragraphs: <p>...</p>
    const pRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
    const paragraphs: { full: string; inner: string; start: number; end: number }[] = [];
    let match: RegExpExecArray | null;

    while ((match = pRegex.exec(html)) !== null) {
      const full = match[0];
      const inner = match[1];
      if (typeof full === "string" && typeof inner === "string") {
        paragraphs.push({
          full,
          inner,
          start: match.index,
          end: match.index + full.length,
        });
      }
    }

    if (paragraphs.length === 0) {
      return [{ type: "html", content: html }];
    }

    // Identify consecutive Q & A pairs
    const qPrefixRegex =
      /^(?:<strong>)?\s*(?:Q\d*|Question\s*\d*)\s*:\s*(?:<\/strong>)?\s*([\s\S]*)/i;
    const aPrefixRegex =
      /^(?:<strong>)?\s*(?:A\d*|Answer\s*\d*)\s*:\s*(?:<\/strong>)?\s*([\s\S]*)/i;

    const faqRanges: { pStartIndex: number; pEndIndex: number; items: FAQItem[] }[] = [];
    let i = 0;

    while (i < paragraphs.length - 1) {
      const pCurrent = paragraphs[i];
      const pNext = paragraphs[i + 1];
      if (!pCurrent || !pNext) {
        i++;
        continue;
      }

      const qMatch = pCurrent.inner.trim().match(qPrefixRegex);
      if (qMatch) {
        const aMatch = pNext.inner.trim().match(aPrefixRegex);
        if (aMatch) {
          const items: FAQItem[] = [];
          const rangeStart = i;

          while (i < paragraphs.length - 1) {
            const curP = paragraphs[i];
            const nextP = paragraphs[i + 1];
            if (!curP || !nextP) break;

            const currentQ = curP.inner.trim().match(qPrefixRegex);
            const currentA = nextP.inner.trim().match(aPrefixRegex);
            const qText = currentQ?.[1];
            const aText = currentA?.[1];

            if (qText !== undefined && aText !== undefined) {
              const cleanQuestion = qText.replace(/<\/?[^>]+(>|$)/g, "").trim();
              const cleanAnswer = aText.replace(/<\/?[^>]+(>|$)/g, "").trim();
              items.push({
                id: items.length + 1,
                question: cleanQuestion,
                answer: cleanAnswer,
              });
              i += 2;
            } else {
              break;
            }
          }

          faqRanges.push({
            pStartIndex: rangeStart,
            pEndIndex: i - 1,
            items,
          });
          continue;
        }
      }
      i++;
    }

    if (faqRanges.length === 0) {
      return [{ type: "html", content: html }];
    }

    // Build segments: prose html interspersed with FAQ accordions
    const result: Segment[] = [];
    let lastHtmlIndex = 0;

    for (const range of faqRanges) {
      const startP = paragraphs[range.pStartIndex];
      const endP = paragraphs[range.pEndIndex];
      if (!startP || !endP) continue;

      const faqStartChar = startP.start;
      const faqEndChar = endP.end;

      if (faqStartChar > lastHtmlIndex) {
        const proseSlice = html.slice(lastHtmlIndex, faqStartChar).trim();
        if (proseSlice) {
          result.push({ type: "html", content: proseSlice });
        }
      }

      result.push({
        type: "faq",
        items: range.items,
      });

      lastHtmlIndex = faqEndChar;
    }

    if (lastHtmlIndex < html.length) {
      const remaining = html.slice(lastHtmlIndex).trim();
      if (remaining) {
        result.push({ type: "html", content: remaining });
      }
    }

    return result;
  }, [html]);

  return (
    <div>
      {segments.map((segment, idx) => {
        if (segment.type === "html" && segment.content) {
          return (
            <div
              key={idx}
              className="ty-prose"
              dangerouslySetInnerHTML={{ __html: segment.content }}
            />
          );
        }
        if (segment.type === "faq" && segment.items) {
          return (
            <div key={idx} className="my-8">
              <ScrollFAQAccordion
                data={segment.items}
                title="Frequently asked questions"
                subtitle="Quick answers to the questions we get the most."
                contactEmail="support@tuyba.com"
              />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

export default ArticleBody;
