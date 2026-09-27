import {
  BLOCK_SLUGS,
  CALLOUT_BLOCK_SLUG,
  CONTENT_CARDS_BLOCK_SLUG,
  CTA_BLOCK_SLUG,
  FAQ_BLOCK_SLUG,
  GALLERY_BLOCK_SLUG,
  HERO_BLOCK_SLUG,
  IMAGE_TEXT_BLOCK_SLUG,
  RICH_TEXT_BLOCK_SLUG,
} from "@nero/cms-core";
import type { BlockRegistry } from "@nero/web-core";
import {
  Callout,
  ContentCards,
  Cta,
  Gallery,
  Hero,
  ImageText,
  RichText,
  type BlockMedia,
  type CalloutVariant,
  type ImageTextLayout,
} from "@nero/ui";
import { lexicalToHtml } from "./lexical-html";
import ScrollFAQAccordion from "@/components/ui/scroll-faqaccordion";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function toBlockMedia(value: unknown): BlockMedia | null {
  const doc = record(value);
  const url = asString(doc.url);
  if (!url) return null;
  return {
    url,
    alt: asString(doc.alt),
    width: typeof doc.width === "number" ? doc.width : undefined,
    height: typeof doc.height === "number" ? doc.height : undefined,
  };
}

/**
 * Maps each stable block `blockType` slug from the `@nero/cms-core` catalog
 * to the `@nero/ui` presentational component that renders it. This is the
 * one place allowed to import both packages — `ui` stays CMS-agnostic and
 * `web-core`'s `renderBlocks` stays free of both Payload and React component
 * knowledge, per the architecture boundaries.
 */
export const blocksRegistry: BlockRegistry = {
  [HERO_BLOCK_SLUG]: (data) => {
    const block = record(data);
    const cta = record(block.cta);
    return (
      <Hero
        heading={asString(block.heading) ?? ""}
        subheading={asString(block.subheading)}
        media={toBlockMedia(block.media)}
        cta={{ label: asString(cta.label), href: asString(cta.href) }}
      />
    );
  },
  [RICH_TEXT_BLOCK_SLUG]: (data) => {
    const block = record(data);
    return <RichText html={lexicalToHtml(block.content)} />;
  },
  [IMAGE_TEXT_BLOCK_SLUG]: (data) => {
    const block = record(data);
    return (
      <ImageText
        media={toBlockMedia(block.media)}
        html={lexicalToHtml(block.content)}
        layout={(asString(block.layout) as ImageTextLayout | undefined) ?? "imageLeft"}
      />
    );
  },
  [GALLERY_BLOCK_SLUG]: (data) => {
    const block = record(data);
    return (
      <Gallery
        images={asArray(block.images).map((image) => ({
          media: toBlockMedia(image.media),
          caption: asString(image.caption),
        }))}
      />
    );
  },
  [CALLOUT_BLOCK_SLUG]: (data) => {
    const block = record(data);
    return (
      <Callout
        variant={(asString(block.variant) as CalloutVariant | undefined) ?? "info"}
        text={asString(block.text) ?? ""}
        attribution={asString(block.attribution)}
      />
    );
  },
  [CONTENT_CARDS_BLOCK_SLUG]: (data) => {
    const block = record(data);
    return (
      <ContentCards
        cards={asArray(block.cards).map((card) => ({
          title: asString(card.title) ?? "",
          summary: asString(card.summary),
          media: toBlockMedia(card.media),
          href: asString(card.href),
        }))}
      />
    );
  },
  [FAQ_BLOCK_SLUG]: (data) => {
    const block = record(data);
    const items = asArray(block.items).map((item, index) => {
      const rawQ = asString(item.question) ?? "";
      const cleanQ = rawQ.replace(/^(?:Q\d*|Question\s*\d*)\s*:\s*/i, "").trim();
      const rawA = asString(item.answer) ?? "";
      const cleanA = rawA.replace(/^(?:A\d*|Answer\s*\d*)\s*:\s*/i, "").trim();
      return {
        id: index + 1,
        question: cleanQ || rawQ,
        answer: cleanA || rawA,
      };
    });
    return (
      <ScrollFAQAccordion
        data={items}
        title="Frequently asked questions"
        subtitle="Quick answers to the questions we get the most."
        contactEmail="support@tuyba.com"
      />
    );
  },
  [CTA_BLOCK_SLUG]: (data) => {
    const block = record(data);
    return (
      <Cta
        heading={asString(block.heading) ?? ""}
        body={asString(block.body)}
        actions={asArray(block.actions).map((action) => ({
          label: asString(action.label) ?? "",
          href: asString(action.href) ?? "",
        }))}
      />
    );
  },
};

/** Every catalog slug must resolve to a renderer here — enforced by a test. */
export const registeredBlockSlugs = BLOCK_SLUGS;
