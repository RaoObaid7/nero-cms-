import type { Block } from "payload";

export const CALLOUT_BLOCK_SLUG = "callout";

export const CALLOUT_VARIANTS = ["quote", "info"] as const;

export const CalloutBlock: Block = {
  slug: CALLOUT_BLOCK_SLUG,
  interfaceName: "CalloutBlock",
  labels: { singular: "Callout", plural: "Callouts" },
  custom: {
    description: "A quotation or information callout with constrained styling.",
  },
  fields: [
    {
      name: "variant",
      type: "select",
      required: true,
      defaultValue: "info",
      options: CALLOUT_VARIANTS.map((value) => ({ label: value, value })),
    },
    {
      name: "text",
      type: "textarea",
      required: true,
    },
    {
      name: "attribution",
      type: "text",
      admin: { description: "Optional; typically used with the quote variant." },
    },
  ],
};

export const calloutFixture = {
  blockType: CALLOUT_BLOCK_SLUG,
  variant: "quote",
  text: "TUYBA made planning our family trip effortless.",
  attribution: "A satisfied traveler",
};
