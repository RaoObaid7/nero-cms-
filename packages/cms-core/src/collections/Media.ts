import type { CollectionAfterChangeHook, CollectionConfig } from "payload";
import { isAdminOrEditor, readAny } from "../access";

/** Applied as the global `upload.limits.fileSize` in `buildNeroConfig`. */
export const MAX_MEDIA_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * SEO-117: when `alt` is empty and `altIsDecorative` is not set, auto-populate
 * it from the filename. Preserves explicit values and intentionally empty alt.
 */
const autoPopulateAlt: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== "create") return doc;
  if (doc.alt || doc.altIsDecorative) return doc;

  const filename = typeof doc.filename === "string" ? doc.filename : "";
  if (!filename) return doc;

  const stem = filename.replace(/\.[^.]+$/, "");
  const generated = stem.replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
  if (!generated) return doc;

  try {
    await req.payload.update({
      collection: "media",
      id: doc.id,
      data: { alt: generated },
      overrideAccess: true,
    });
    return { ...doc, alt: generated };
  } catch {
    req.payload.logger.warn(`media autoPopulateAlt: could not update alt for ${doc.id}`);
    return doc;
  }
};

export const Media: CollectionConfig = {
  slug: "media",
  upload: {
    // Raster image types only. SVG is deliberately excluded: it can carry
    // inline `<script>`/event-handler payloads and this collection is
    // publicly readable, so allowing it would be stored XSS.
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"],
    staticDir: "media",
  },
  admin: {
    useAsTitle: "alt",
  },
  access: {
    read: readAny,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  hooks: {
    afterChange: [autoPopulateAlt],
  },
  fields: [
    {
      name: "alt",
      type: "text",
      admin: {
        description:
          "Alternative text for screen readers and search engines. Auto-populated from the filename on upload; edit as needed. Set to empty only for purely decorative images and tick the decorative flag.",
      },
    },
    {
      name: "altIsDecorative",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description:
          "SEO-117: tick this when the image is purely decorative (adds no information). The alt text will be intentionally empty and the auto-population is suppressed.",
      },
    },
  ],
};
