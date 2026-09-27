import { buildConfig } from "payload";
import type { CollectionConfig, Config, GlobalConfig, FieldAccess } from "payload";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import {
  buildArticlesCollection,
  Categories,
  Media,
  MAX_MEDIA_UPLOAD_BYTES,
  NotFoundEvents,
  buildPagesCollection,
  Redirects,
  Tags,
  Users,
} from "./collections";
import { GtmSettings, SiteSettings } from "./globals";
import { PREVIEWABLE_COLLECTIONS, withPreview } from "./preview";
import type { PreviewUrlBuilder } from "./preview";
import {
  createPublishLifecycleHooks,
  createTaxonomyCacheHooks,
} from "./publishing/publishLifecycleHooks";
import { SCHEDULABLE_COLLECTIONS } from "./publishing/scheduledPublish";
import type { SchedulableCollection } from "./publishing/scheduledPublish";
import { isAdminOrEditorField } from "./access";

export interface BuildNeroConfigOptions {
  /** Public base URL of the application, e.g. `https://tuyba.example.com`. */
  serverURL: string;
  /** Secret used to sign Payload tokens. Must come from an environment variable. */
  secret: string;
  /** Database adapter instance, e.g. `postgresAdapter({ pool: { connectionString } })`. */
  db: Config["db"];
  /** Additional collections a consuming application registers on top of the base set. */
  collections?: CollectionConfig[];
  /** Additional globals a consuming application registers on top of the base set. */
  globals?: GlobalConfig[];
  /** Additional Payload plugins a consuming application registers. */
  plugins?: Config["plugins"];
  cors?: Config["cors"];
  typescript?: Config["typescript"];
  /**
   * Wires the admin "Preview" button and live preview for `pages`/`articles`
   * to a frontend route. Omit to leave preview unconfigured. The route itself
   * lives in the consuming app, not here — see `./preview`.
   */
  previewUrl?: PreviewUrlBuilder;
  /**
   * Wires cache-tag invalidation and automatic slug-change redirects
   * (acceptance criterion 11 / SEO-109) onto `pages`/`articles`. Omit to
   * leave both unconfigured. The public URL shape and the actual
   * `revalidateTag` call are application concerns — see
   * `./publishing/publishLifecycleHooks`.
   */
  cacheAndRedirects?: {
    locale?: string;
    pathFor?: (args: { collectionSlug: SchedulableCollection; slug: string }) => string;
    invalidate?: (tags: string[]) => void | Promise<void>;
  };
  /**
   * SEO-120: controls whether per-document SEO fields (title, description,
   * canonical, etc.) are included in Pages and Articles.
   *
   * - `true` (default): SEO fields are injected into both collections so
   *   editors can set per-document overrides.
   * - `false`: SEO fields are entirely omitted. Use this when a consumer
   *   application manages SEO through a different mechanism, or to keep
   *   generated types and the admin clean for a minimal deployment.
   */
  seoEnabled?: boolean;
  /**
   * SEO-120: field-level access check applied to every SEO field's `update`
   * permission. Defaults to `isAdminOrEditor`. Override to restrict SEO
   * editing to admins only, or to loosen it for a custom RBAC model.
   */
  seoAccess?: FieldAccess;
}

/**
 * Builds a Payload config from the shared NERO CMS base: the `users`,
 * `media`, `pages`, `articles`, `categories` and `tags` collections, the
 * default rich text editor and role-aware access helpers. Consuming
 * applications inject their own database adapter, secret and server URL, and
 * may register additional collections or plugins through the public
 * extension points below — this factory never branches on a customer name.
 */
export function buildNeroConfig(options: BuildNeroConfigOptions): ReturnType<typeof buildConfig> {
  const {
    serverURL,
    secret,
    db,
    collections = [],
    globals = [],
    plugins = [],
    cors,
    typescript,
    previewUrl,
    cacheAndRedirects,
    seoEnabled = true,
    seoAccess = isAdminOrEditorField,
  } = options;

  const seoOptions = seoEnabled
    ? { seoEnabled: true as const, seoAccess }
    : { seoEnabled: false as const };

  const baseCollections: CollectionConfig[] = [
    Users,
    Media,
    buildPagesCollection(seoOptions),
    buildArticlesCollection(seoOptions),
    Categories,
    Tags,
    Redirects,
    NotFoundEvents,
  ];

  const baseGlobals: GlobalConfig[] = [GtmSettings, SiteSettings];

  const previewableSlugs: readonly string[] = PREVIEWABLE_COLLECTIONS;
  const schedulableSlugs: readonly string[] = SCHEDULABLE_COLLECTIONS;

  const resolvedCollections = baseCollections.map((collection) => {
    let resolved = collection;

    if (previewUrl && previewableSlugs.includes(collection.slug)) {
      resolved = withPreview(
        resolved,
        resolved.slug as (typeof PREVIEWABLE_COLLECTIONS)[number],
        previewUrl,
      );
    }

    if (cacheAndRedirects?.invalidate && ["categories", "tags"].includes(collection.slug)) {
      const locale = cacheAndRedirects.locale ?? "en";
      const { afterChange, afterDelete } = createTaxonomyCacheHooks(
        collection.slug,
        locale,
        cacheAndRedirects.invalidate,
      );
      resolved = {
        ...resolved,
        hooks: {
          ...resolved.hooks,
          afterChange: [...(resolved.hooks?.afterChange ?? []), afterChange],
          afterDelete: [...(resolved.hooks?.afterDelete ?? []), afterDelete],
        },
      };
    }

    if (cacheAndRedirects && schedulableSlugs.includes(collection.slug)) {
      const collectionSlug = collection.slug as SchedulableCollection;
      const { afterChange, afterDelete } = createPublishLifecycleHooks({
        collectionSlug,
        locale: cacheAndRedirects.locale,
        pathFor: cacheAndRedirects.pathFor
          ? (slug: string) => cacheAndRedirects.pathFor!({ collectionSlug, slug })
          : undefined,
        invalidate: cacheAndRedirects.invalidate,
      });
      resolved = {
        ...resolved,
        hooks: {
          ...resolved.hooks,
          afterChange: [...(resolved.hooks?.afterChange ?? []), afterChange],
          afterDelete: [...(resolved.hooks?.afterDelete ?? []), afterDelete],
        },
      };
    }

    return resolved;
  });

  return buildConfig({
    serverURL,
    secret,
    db,
    editor: lexicalEditor(),
    admin: {
      user: Users.slug,
      ...(previewUrl ? { livePreview: { collections: [...PREVIEWABLE_COLLECTIONS] } } : {}),
    },
    collections: [...resolvedCollections, ...collections],
    globals: [...baseGlobals, ...globals],
    plugins,
    cors,
    typescript,
    // Global upload body-parser limit backing the Media collection's size
    // constraint (Payload has no per-collection filesize option).
    upload: {
      limits: {
        fileSize: MAX_MEDIA_UPLOAD_BYTES,
      },
    },
  });
}
