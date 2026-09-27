import type { CollectionConfig } from "payload";
import { isAdminOrEditor, readAny } from "../access";
import { slugField } from "../fields/slugField";

/** Unversioned and publicly readable for the same reasons as `Categories`. */
export const Tags: CollectionConfig = {
  slug: "tags",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "slug", "updatedAt"],
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
  ],
};
