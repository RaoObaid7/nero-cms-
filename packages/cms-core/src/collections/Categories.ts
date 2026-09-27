import type { CollectionConfig } from "payload";
import { isAdminOrEditor, readAny } from "../access";
import { slugField } from "../fields/slugField";

/**
 * Taxonomy is deliberately not versioned and is publicly readable.
 *
 * Categories are navigational labels, not editorial documents: they carry no
 * draft state to protect, an article referencing an unpublished category would
 * render a broken link, and a draft/publish lifecycle on a term would make the
 * primary-category relation (which SEO work in a later sprint consumes) depend
 * on two independent publication states. Sprint 2's acceptance criterion 3
 * names versions for Articles; this divergence is intentional.
 */
export const Categories: CollectionConfig = {
  slug: "categories",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "slug", "parent", "updatedAt"],
  },
  access: {
    read: readAny,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  fields: [
    { name: "name", type: "text", required: true },
    slugField({ titleFieldPath: "name" }),
    { name: "description", type: "textarea" },
    {
      name: "parent",
      type: "relationship",
      relationTo: "categories",
      admin: { description: "Optional parent category, for a shallow hierarchy." },
    },
  ],
};
