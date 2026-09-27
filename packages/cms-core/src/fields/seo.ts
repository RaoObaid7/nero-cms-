import type { Field, FieldAccess } from "payload";
import { validateSafeHref } from "../blocks/shared";

export interface SeoFieldsOptions {
  /** Name of the grouping field. Defaults to `seo`. */
  name?: string;
  /**
   * SEO-120: field-level `update` access applied to every SEO field.
   * Defaults to unrestricted within whatever the collection permits.
   * Pass `isAdmin` to restrict SEO editing to administrators only.
   */
  seoAccess?: FieldAccess;
}

/**
 * Per-document SEO fields (SEO-101/102/112), grouped in a collapsible
 * section below the main content so the WordPress-familiar publish flow
 * (title → content → publish) stays the obvious path — see PRD §6. Every
 * field is an optional override: when empty, the public route falls back to
 * a content-type default (see `apps/tuyba`'s SEO metadata helper), so
 * editors are never required to fill these in.
 */
export function seoFields(options: SeoFieldsOptions = {}): Field[] {
  const { name = "seo", seoAccess } = options;

  const accessRule = seoAccess ? { access: { update: seoAccess } } : {};

  return [
    {
      type: "collapsible",
      label: "Search engine optimization (SEO)",
      admin: { initCollapsed: true },
      fields: [
        {
          name,
          type: "group",
          fields: [
            {
              name: "metaTitle",
              type: "text",
              maxLength: 70,
              ...accessRule,
              admin: {
                description:
                  "Shown as the page title in search results and browser tabs. Leave blank to use the document title.",
              },
            },
            {
              name: "metaDescription",
              type: "textarea",
              maxLength: 160,
              ...accessRule,
              admin: {
                description:
                  "Shown as the snippet under the title in search results. Leave blank to use the excerpt.",
              },
            },
            {
              name: "canonicalUrl",
              type: "text",
              validate: validateSafeHref,
              ...accessRule,
              admin: {
                description:
                  "Override the canonical URL for this document. Leave blank to use its own URL.",
              },
            },
            {
              name: "noindex",
              type: "checkbox",
              defaultValue: false,
              ...accessRule,
              admin: {
                description: "Hide this document from search engines and the sitemap.",
              },
            },
            {
              name: "nofollow",
              type: "checkbox",
              defaultValue: false,
              ...accessRule,
              admin: {
                description: "Tell search engines not to follow links on this page.",
              },
            },
            {
              name: "ogImage",
              type: "relationship",
              relationTo: "media",
              ...accessRule,
              admin: {
                description:
                  "Image shown when this page is shared on social media. Leave blank to use the cover image, if any.",
              },
            },
            {
              name: "focusKeyword",
              type: "text",
              ...accessRule,
              admin: {
                description:
                  "SEO-104: the primary keyword you want this page to rank for. Used by the SEO analysis checklist.",
              },
            },
            {
              name: "additionalKeywords",
              type: "text",
              ...accessRule,
              admin: {
                description:
                  "SEO-104: comma-separated additional keywords (optional). Used for duplicate keyword detection.",
              },
            },
          ],
        },
      ],
    },
  ];
}
