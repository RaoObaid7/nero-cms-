import type { Block } from "payload";
import { buildInlineTextEditor } from "../richtext/editors";

export const RICH_TEXT_BLOCK_SLUG = "richText";

export const RichTextBlock: Block = {
  slug: RICH_TEXT_BLOCK_SLUG,
  interfaceName: "RichTextBlock",
  labels: { singular: "Rich Text", plural: "Rich Text Blocks" },
  custom: {
    description: "A free-form rich text section using the shared editor toolset.",
  },
  fields: [
    {
      name: "content",
      type: "richText",
      required: true,
      // This block is itself insertable inline into a body/content editor
      // (see `buildBodyEditor`). Its own editor must never gain
      // `BlocksFeature` — PRD section 6 forbids unlimited nesting, and this
      // keeps nesting capped at one level.
      editor: buildInlineTextEditor(),
    },
  ],
};

export const richTextFixture = {
  blockType: RICH_TEXT_BLOCK_SLUG,
  content: {
    root: {
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [{ type: "text", text: "Rich text block fixture content.", version: 1 }],
          version: 1,
        },
      ],
      direction: "ltr" as const,
      format: "" as const,
      indent: 0,
      version: 1,
    },
  },
};
