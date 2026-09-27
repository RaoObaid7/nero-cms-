import type { Block } from "payload";

export const GALLERY_BLOCK_SLUG = "gallery";

export const GalleryBlock: Block = {
  slug: GALLERY_BLOCK_SLUG,
  interfaceName: "GalleryBlock",
  labels: { singular: "Gallery", plural: "Galleries" },
  custom: {
    description: "An ordered set of images, each with an optional caption.",
  },
  fields: [
    {
      name: "images",
      type: "array",
      required: true,
      minRows: 1,
      labels: { singular: "Image", plural: "Images" },
      fields: [
        { name: "media", type: "relationship", relationTo: "media", required: true },
        { name: "caption", type: "text" },
      ],
    },
  ],
};

export const galleryFixture = {
  blockType: GALLERY_BLOCK_SLUG,
  images: [
    { media: null, caption: "First gallery image." },
    { media: null, caption: "Second gallery image." },
  ],
};
