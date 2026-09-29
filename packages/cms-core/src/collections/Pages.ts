import type { CollectionConfig, FieldAccess } from "payload";
import { isAdminOrEditor, publishedOrAuthenticated } from "../access";
import { blockCatalog } from "../blocks";
import { publishAtField } from "../fields/publishAt";
import { slugField } from "../fields/slugField";
import { seoFields } from "../fields/seo";
import { enforceScheduledPublish } from "../hooks/enforceScheduledPublish";
import { buildBodyEditor } from "../richtext/editors";

export interface PagesSeoOptions {
  seoEnabled: boolean;
  seoAccess?: FieldAccess;
}

export function buildPagesCollection(
  seo: PagesSeoOptions = { seoEnabled: true },
): CollectionConfig {
  return {
    slug: "pages",
    admin: {
      useAsTitle: "title",
      defaultColumns: ["title", "slug", "_status", "publishAt", "updatedAt"],
      description: "Standalone pages, e.g. About or Contact. Not part of the blog.",
    },
    versions: {
      drafts: {
        autosave: false,
      },
    },
    hooks: {
      beforeChange: [enforceScheduledPublish],
    },
    access: {
      read: publishedOrAuthenticated,
      create: isAdminOrEditor,
      update: isAdminOrEditor,
      delete: isAdminOrEditor,
    },
    fields: [
      {
        name: "title",
        type: "text",
        required: true,
        admin: { description: "Shown as the page heading and in the browser tab." },
      },
      slugField(),
      {
        name: "content",
        type: "richText",
        editor: buildBodyEditor({ blocks: blockCatalog }),
      },
      {
        name: "layout",
        type: "blocks",
        blocks: blockCatalog,
        admin: { description: "Optional page sections, added and reordered below the content." },
      },
      {
        type: "collapsible",
        label: "Local business (SEO-118)",
        admin: { initCollapsed: true },
        fields: [
          {
            name: "localBusiness",
            type: "group",
            admin: {
              description:
                "When filled in, adds a LocalBusiness JSON-LD block to this page. Leave blank if the page is not about a physical location.",
            },
            fields: [
              { name: "businessName", type: "text" },
              { name: "businessDescription", type: "text" },
              { name: "telephone", type: "text" },
              { name: "streetAddress", type: "text" },
              { name: "city", type: "text" },
              { name: "country", type: "text" },
              {
                name: "latitude",
                type: "number",
                admin: { description: "Decimal degrees, e.g. 51.5074" },
              },
              {
                name: "longitude",
                type: "number",
                admin: { description: "Decimal degrees, e.g. -0.1278" },
              },
              {
                name: "openingHours",
                type: "array",
                admin: {
                  description:
                    'Opening hours specification, e.g. "Mo-Fr 09:00-17:00". One entry per period.',
                },
                fields: [{ name: "value", type: "text" }],
              },
              { name: "priceRange", type: "text", admin: { description: 'e.g. "$$"' } },
              {
                name: "logo",
                type: "relationship",
                relationTo: "media",
                admin: { description: "Logo image for the business schema." },
              },
            ],
          },
        ],
      },
      {
        type: "collapsible",
        label: "Custom schema (SEO-113)",
        admin: { initCollapsed: true },
        fields: [
          {
            name: "customSchema",
            type: "textarea",
            admin: {
              description:
                "Paste a valid JSON-LD schema object here. It is merged with the generated schemas in the page head. Invalid JSON is ignored with a server-side warning.",
            },
            validate: (value: unknown) => {
              if (!value) return true;
              if (typeof value !== "string") return true;
              try {
                JSON.parse(value);
                return true;
              } catch {
                return "Custom schema must be valid JSON.";
              }
            },
          },
        ],
      },
      publishAtField,
      ...(seo.seoEnabled ? seoFields({ seoAccess: seo.seoAccess }) : []),
    ],
  };
}

export const Pages: CollectionConfig = buildPagesCollection({ seoEnabled: true });
