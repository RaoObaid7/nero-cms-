import type { Block } from "payload";
import { validateSafeHref } from "./shared";

export const CTA_BLOCK_SLUG = "cta";

export const CtaBlock: Block = {
  slug: CTA_BLOCK_SLUG,
  interfaceName: "CtaBlock",
  labels: { singular: "Call to Action", plural: "Call to Action Blocks" },
  custom: {
    description: "A heading, supporting copy and one or two action links.",
  },
  fields: [
    { name: "heading", type: "text", required: true },
    { name: "body", type: "textarea" },
    {
      name: "actions",
      type: "array",
      required: true,
      minRows: 1,
      maxRows: 2,
      labels: { singular: "Action", plural: "Actions" },
      fields: [
        { name: "label", type: "text", required: true },
        { name: "href", type: "text", required: true, validate: validateSafeHref },
      ],
    },
  ],
};

export const ctaFixture = {
  blockType: CTA_BLOCK_SLUG,
  heading: "Ready to plan your journey?",
  body: "Talk to a TUYBA travel advisor today.",
  actions: [{ label: "Get in touch", href: "/contact" }],
};
