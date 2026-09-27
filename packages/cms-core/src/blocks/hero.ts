import type { Block } from "payload";
import { validateSafeHref } from "./shared";

export const HERO_BLOCK_SLUG = "hero";

export const HeroBlock: Block = {
  slug: HERO_BLOCK_SLUG,
  interfaceName: "HeroBlock",
  labels: { singular: "Hero", plural: "Heroes" },
  custom: {
    description:
      "A page-opening banner with a heading, optional media and an optional call to action.",
  },
  fields: [
    {
      name: "heading",
      type: "text",
      required: true,
      admin: { description: "Rendered as an H2 — templates own the page's H1." },
    },
    {
      name: "subheading",
      type: "textarea",
      admin: { description: "Optional supporting line under the heading." },
    },
    {
      name: "media",
      type: "relationship",
      relationTo: "media",
      admin: { description: "Optional background or supporting image." },
    },
    {
      name: "cta",
      type: "group",
      admin: { description: "Optional single call-to-action link." },
      fields: [
        { name: "label", type: "text" },
        { name: "href", type: "text", validate: validateSafeHref },
      ],
    },
  ],
};

export const heroFixture = {
  blockType: HERO_BLOCK_SLUG,
  heading: "Travel with confidence",
  subheading: "Curated, Islamic-compliant journeys for the whole family.",
  media: null,
  cta: { label: "Explore packages", href: "/packages" },
};
