import type { GlobalConfig } from "payload";
import { isAdmin, isAdminOrEditor } from "../access";

/**
 * Site-wide settings (publication name for news sitemaps, podcast series info,
 * local business defaults). Consumed by several SEO capabilities in Sprint 3B.
 */
export const SiteSettings: GlobalConfig = {
  slug: "site-settings",
  label: "Site settings",
  admin: {
    description: "Site-wide metadata used by SEO, sitemaps and schema markup.",
    group: "Site settings",
  },
  access: {
    read: isAdminOrEditor,
    update: isAdmin,
  },
  versions: {
    max: 20,
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "General",
          fields: [
            {
              name: "siteName",
              type: "text",
              admin: {
                description: "Displayed in schema markup and social sharing previews.",
              },
            },
            {
              name: "siteUrl",
              type: "text",
              admin: {
                description:
                  "Canonical base URL, e.g. https://example.com. Used to normalise imported redirect URLs.",
              },
            },
          ],
        },
        {
          label: "News sitemap",
          fields: [
            {
              name: "newsEnabled",
              type: "checkbox",
              defaultValue: false,
              admin: {
                description:
                  "Opt-in news sitemap (SEO-108). When enabled, articles marked as news appear in /news-sitemap.xml.",
              },
            },
            {
              name: "publicationName",
              type: "text",
              admin: {
                description: "Publication name for Google News (required when news sitemap is on).",
                condition: (data) => Boolean(data?.newsEnabled),
              },
            },
          ],
        },
        {
          label: "Podcast",
          fields: [
            {
              name: "podcastSeriesName",
              type: "text",
              admin: { description: "Name of the podcast series for JSON-LD (SEO-119)." },
            },
            {
              name: "podcastSeriesDescription",
              type: "text",
              admin: { description: "Short description of the series." },
            },
            {
              name: "podcastFeedUrl",
              type: "text",
              admin: { description: "RSS feed URL for the podcast series." },
            },
            {
              name: "podcastAuthor",
              type: "text",
              admin: { description: "Host or author name (used in JSON-LD)." },
            },
          ],
        },
      ],
    },
  ],
};
