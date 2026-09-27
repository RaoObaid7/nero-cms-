import type { Block } from "payload";
import { CALLOUT_BLOCK_SLUG, CalloutBlock, calloutFixture } from "./callout";
import { CONTENT_CARDS_BLOCK_SLUG, ContentCardsBlock, contentCardsFixture } from "./contentCards";
import { CTA_BLOCK_SLUG, CtaBlock, ctaFixture } from "./cta";
import { FAQ_BLOCK_SLUG, FaqBlock, faqFixture } from "./faq";
import { GALLERY_BLOCK_SLUG, GalleryBlock, galleryFixture } from "./gallery";
import { HERO_BLOCK_SLUG, HeroBlock, heroFixture } from "./hero";
import { IMAGE_TEXT_BLOCK_SLUG, ImageTextBlock, imageTextFixture } from "./imageText";
import { RICH_TEXT_BLOCK_SLUG, RichTextBlock, richTextFixture } from "./richText";

export { CalloutBlock, CALLOUT_BLOCK_SLUG, CALLOUT_VARIANTS, calloutFixture } from "./callout";
export { ContentCardsBlock, CONTENT_CARDS_BLOCK_SLUG, contentCardsFixture } from "./contentCards";
export { CtaBlock, CTA_BLOCK_SLUG, ctaFixture } from "./cta";
export { FaqBlock, FAQ_BLOCK_SLUG, faqFixture } from "./faq";
export { GalleryBlock, GALLERY_BLOCK_SLUG, galleryFixture } from "./gallery";
export { HeroBlock, HERO_BLOCK_SLUG, heroFixture } from "./hero";
export {
  ImageTextBlock,
  IMAGE_TEXT_BLOCK_SLUG,
  IMAGE_TEXT_LAYOUTS,
  imageTextFixture,
} from "./imageText";
export { RichTextBlock, RICH_TEXT_BLOCK_SLUG, richTextFixture } from "./richText";

/**
 * Every block a consuming app can select from for the `layout` field on
 * `Pages`/`Articles`. A project module may pick a subset and add its own
 * blocks without forking — see PRD section 5's extension-point requirement —
 * by building its own `Block[]` array instead of importing this one.
 */
export const blockCatalog: Block[] = [
  HeroBlock,
  RichTextBlock,
  ImageTextBlock,
  GalleryBlock,
  CalloutBlock,
  ContentCardsBlock,
  FaqBlock,
  CtaBlock,
];

/** Stable, persisted `blockType` slugs for every catalog block, in catalog order. */
export const BLOCK_SLUGS = [
  HERO_BLOCK_SLUG,
  RICH_TEXT_BLOCK_SLUG,
  IMAGE_TEXT_BLOCK_SLUG,
  GALLERY_BLOCK_SLUG,
  CALLOUT_BLOCK_SLUG,
  CONTENT_CARDS_BLOCK_SLUG,
  FAQ_BLOCK_SLUG,
  CTA_BLOCK_SLUG,
] as const;

export type BlockSlug = (typeof BLOCK_SLUGS)[number];

/**
 * One content fixture per catalog block, keyed by `blockType`. Sprint 2
 * requires every registered block to carry a fixture; the completeness test
 * in `__tests__/blocks.test.ts` asserts this map covers `BLOCK_SLUGS` exactly.
 */
export const blockFixtures: Record<BlockSlug, Record<string, unknown>> = {
  [HERO_BLOCK_SLUG]: heroFixture,
  [RICH_TEXT_BLOCK_SLUG]: richTextFixture,
  [IMAGE_TEXT_BLOCK_SLUG]: imageTextFixture,
  [GALLERY_BLOCK_SLUG]: galleryFixture,
  [CALLOUT_BLOCK_SLUG]: calloutFixture,
  [CONTENT_CARDS_BLOCK_SLUG]: contentCardsFixture,
  [FAQ_BLOCK_SLUG]: faqFixture,
  [CTA_BLOCK_SLUG]: ctaFixture,
};
