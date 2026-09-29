import type { Block } from "payload";
import { buildInlineTextEditor } from "../richtext/editors";

export const IMAGE_TEXT_BLOCK_SLUG = "imageText";

export const IMAGE_TEXT_LAYOUTS = ["imageLeft", "imageRight"] as const;

export const ImageTextBlock: Block = {
  slug: IMAGE_TEXT_BLOCK_SLUG,
  interfaceName: "ImageTextBlock",
  labels: { singular: "Image + Text", plural: "Image + Text Blocks" },
  custom: {
    description: "Media paired with rich text, in a constrained left/right layout.",
  },
  fields: [
    {
      name: "media",
      type: "relationship",
      relationTo: "media",
      required: true,
    },
    {
      name: "content",
      type: "richText",
      required: true,
      // No `BlocksFeature` here — see the matching comment on RichTextBlock.
      editor: buildInlineTextEditor(),
    },
    {
      name: "layout",
      type: "select",
      required: true,
      defaultValue: "imageLeft",
      options: IMAGE_TEXT_LAYOUTS.map((value) => ({ label: value, value })),
      admin: { description: "Constrained layout variant; no free-form positioning." },
    },
  ],
};

export const imageTextFixture = {
  blockType: IMAGE_TEXT_BLOCK_SLUG,
  media: null,
  content: {
    root: {
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [{ type: "text", text: "Image and text block fixture content.", version: 1 }],
          version: 1,
        },
      ],
      direction: "ltr" as const,
      format: "" as const,
      indent: 0,
      version: 1,
    },
  },
  layout: "imageLeft",
};
