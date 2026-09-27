import type { Block } from "payload";
import { validateSafeHref } from "./shared";

export const CONTENT_CARDS_BLOCK_SLUG = "contentCards";

export const ContentCardsBlock: Block = {
  slug: CONTENT_CARDS_BLOCK_SLUG,
  interfaceName: "ContentCardsBlock",
  labels: { singular: "Content Cards", plural: "Content Cards Blocks" },
  custom: {
    description: "A list of linked cards, each with a title, summary and optional media.",
  },
  fields: [
    {
      name: "cards",
      type: "array",
      required: true,
      minRows: 1,
      labels: { singular: "Card", plural: "Cards" },
      fields: [
        { name: "title", type: "text", required: true },
        { name: "summary", type: "textarea" },
        { name: "media", type: "relationship", relationTo: "media" },
        { name: "href", type: "text", validate: validateSafeHref },
      ],
    },
  ],
};

export const contentCardsFixture = {
  blockType: CONTENT_CARDS_BLOCK_SLUG,
  cards: [
    {
      title: "Hajj packages",
      summary: "Fully guided, certified journeys.",
      media: null,
      href: "/packages/hajj",
    },
    {
      title: "Umrah packages",
      summary: "Flexible dates, verified providers.",
      media: null,
      href: "/packages/umrah",
    },
  ],
};
