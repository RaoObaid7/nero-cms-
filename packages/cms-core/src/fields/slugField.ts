import type { TextField } from "payload";
import { slugify } from "payload/shared";

export interface SlugFieldOptions {
  /** Field name. Defaults to `slug`. */
  name?: string;
  /** Top-level field to derive the slug from. Defaults to `title`. */
  titleFieldPath?: string;
  /** Defaults to `true`. */
  required?: boolean;
}

/**
 * Reusable slug field: unique, indexed, with the WordPress-style live
 * auto-fill admin UI wired in (`../client/SlugField`) — see that file for the
 * auto-sync/stop-condition behavior. Every consumer collection gets it
 * through this one factory, per PRD §6's requirement that the behavior live
 * in the shared platform package, not be re-implemented per site.
 *
 * The `beforeValidate` hook below is a narrow fallback for writes that never
 * go through the admin UI at all (API-only creates, e.g. seed scripts): if
 * the caller didn't supply a slug, derive one from the title once at create
 * time. It does not run the "stop syncing" logic — that only matters for the
 * live-typing admin experience.
 */
export function slugField(options: SlugFieldOptions = {}): TextField {
  const { name = "slug", titleFieldPath = "title", required = true } = options;

  return {
    name,
    type: "text",
    required,
    unique: true,
    index: true,
    admin: {
      position: "sidebar",
      components: {
        Field: {
          path: "@nero/cms-core/client#SlugField",
          clientProps: { titleFieldPath },
        },
      },
    },
    hooks: {
      beforeValidate: [
        ({ value, data, operation }) => {
          if (value) return value;
          if (operation !== "create") return value;
          const title = data?.[titleFieldPath];
          return typeof title === "string" && title ? slugify(title) : value;
        },
      ],
    },
  };
}
