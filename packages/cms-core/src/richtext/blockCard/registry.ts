import type { Block } from "payload";
import type { BlockSlug } from "../../blocks";

/**
 * `admin.components.Block` import-map path per catalog block. Follows the
 * same `"@nero/cms-core/client#<Export>"` convention as `SlugField`; the
 * named exports live in `blockCards.tsx` and are re-exported from
 * `packages/cms-core/src/client/index.ts`.
 */
export const BLOCK_CARD_COMPONENT: Record<BlockSlug, string> = {
  hero: "@nero/cms-core/client#HeroBlockCard",
  richText: "@nero/cms-core/client#RichTextBlockCard",
  imageText: "@nero/cms-core/client#ImageTextBlockCard",
  gallery: "@nero/cms-core/client#GalleryBlockCard",
  callout: "@nero/cms-core/client#CalloutBlockCard",
  contentCards: "@nero/cms-core/client#ContentCardsBlockCard",
  faq: "@nero/cms-core/client#FaqBlockCard",
  cta: "@nero/cms-core/client#CtaBlockCard",
};

/**
 * Returns a copy of `blocks` with each block's Gutenberg-style card
 * (`BlockCard.tsx`) set as its `admin.components.Block`. Used only when
 * building the catalog passed to `BlocksFeature` for inline insertion
 * (`buildBodyEditor`) — never applied to the `blockCatalog` objects the
 * `layout` field renders, which is why this returns new objects rather
 * than mutating `blocks` in place. The same `slug` and `fields` are kept
 * unchanged, so stored block data is identical whether a block was
 * inserted inline or added via `layout`.
 */
export function withBlockCards(blocks: Block[]): Block[] {
  return blocks.map((block) => {
    const component = BLOCK_CARD_COMPONENT[block.slug as BlockSlug];
    if (!component) return block;
    return {
      ...block,
      admin: {
        ...block.admin,
        components: {
          ...block.admin?.components,
          Block: component,
        },
      },
    };
  });
}
