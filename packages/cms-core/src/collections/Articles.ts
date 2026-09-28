import type { CollectionConfig, FieldAccess } from "payload";
import {
  lexicalEditor,
  HeadingFeature,
  BlockquoteFeature,
  BoldFeature,
  ItalicFeature,
  UnderlineFeature,
  StrikethroughFeature,
  InlineCodeFeature,
  OrderedListFeature,
  UnorderedListFeature,
  LinkFeature,
  HorizontalRuleFeature,
  AlignFeature,
  UploadFeature,
  FixedToolbarFeature,
} from "@payloadcms/richtext-lexical";
import { isAdminOrEditor, publishedOrAuthenticated } from "../access";
import { blockCatalog } from "../blocks";
import { publishAtField } from "../fields/publishAt";
import { slugField } from "../fields/slugField";
import { seoFields } from "../fields/seo";
import { enforceScheduledPublish } from "../hooks/enforceScheduledPublish";
import { validateSafeHref } from "../blocks/shared";

export interface ArticlesSeoOptions {
  seoEnabled: boolean;
  seoAccess?: FieldAccess;
}

export function buildArticlesCollection(
  seo: ArticlesSeoOptions = { seoEnabled: true },
): CollectionConfig {
  return {
    slug: "articles",
    admin: {
      useAsTitle: "title",
      defaultColumns: ["title", "slug", "_status", "publishAt", "updatedAt"],
      description: "Blog posts and news.",
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
        admin: { description: "Shown as the article heading and in the browser tab." },
      },
      slugField(),
      {
        name: "excerpt",
        type: "textarea",
        admin: {
          description: "A short summary shown in listings and used as the default search snippet.",
        },
      },
      {
        name: "body",
        type: "richText",
        editor: lexicalEditor({
          features: () => [
            HeadingFeature({ enabledHeadingSizes: ["h1", "h2", "h3", "h4"] }),
            BoldFeature(),
            ItalicFeature(),
            UnderlineFeature(),
            StrikethroughFeature(),
            InlineCodeFeature(),
            BlockquoteFeature(),
            OrderedListFeature(),
            UnorderedListFeature(),
            LinkFeature(),
            UploadFeature(),
            HorizontalRuleFeature(),
            AlignFeature(),
            FixedToolbarFeature(),
          ],
        }),
      },
      {
        name: "layout",
        type: "blocks",
        blocks: blockCatalog,
        admin: { description: "Optional extra sections, added and reordered below the body." },
      },
      {
        name: "coverImage",
        type: "upload",
        relationTo: "media",
        admin: {
          position: "sidebar",
          description: "Shown in listings and as the social share image.",
        },
      },
      {
        name: "author",
        type: "relationship",
        relationTo: "users",
        admin: { position: "sidebar" },
      },
      {
        name: "primaryCategory",
        type: "relationship",
        relationTo: "categories",
        admin: {
          position: "sidebar",
          description:
            "The main category this article belongs to, used for its URL and breadcrumbs.",
        },
      },
      {
        name: "additionalCategories",
        type: "relationship",
        relationTo: "categories",
        hasMany: true,
        admin: { position: "sidebar" },
      },
      {
        name: "tags",
        type: "text",
        admin: {
          position: "sidebar",
          components: {
            Field: {
              path: "@nero/cms-core/client#TagsField",
            },
          },
        },
      },
      publishAtField,
      {
        name: "newsArticle",
        type: "checkbox",
        defaultValue: false,
        admin: {
          position: "sidebar",
          description:
            "SEO-108: mark this article as a news item. When enabled, it appears in /news-sitemap.xml (requires news sitemap to be enabled in Site Settings).",
        },
      },
      {
        type: "collapsible",
        label: "Podcast episode (SEO-119)",
        admin: { initCollapsed: true },
        fields: [
          {
            name: "isPodcastEpisode",
            type: "checkbox",
            defaultValue: false,
            admin: {
              description:
                "Mark this article as a podcast episode. Enables episode schema and additional fields.",
            },
          },
          {
            name: "podcastEpisodeNumber",
            type: "number",
            admin: {
              description: "Episode number within the series.",
              condition: (data) => Boolean(data?.isPodcastEpisode),
            },
          },
          {
            name: "podcastSeason",
            type: "number",
            admin: {
              description: "Season number (leave blank for series without seasons).",
              condition: (data) => Boolean(data?.isPodcastEpisode),
            },
          },
          {
            name: "podcastAudioUrl",
            type: "text",
            validate: validateSafeHref,
            admin: {
              description: "Direct URL to the episode audio file.",
              condition: (data) => Boolean(data?.isPodcastEpisode),
            },
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
      ...(seo.seoEnabled ? seoFields({ seoAccess: seo.seoAccess }) : []),
    ],
  };
}

export const Articles: CollectionConfig = buildArticlesCollection({ seoEnabled: true });
