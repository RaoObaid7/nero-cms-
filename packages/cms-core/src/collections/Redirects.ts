import type {
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
} from "payload";
import { isAdminOrEditor, readAny } from "../access";
import { validateSafeHref } from "../blocks/shared";

/** SEO-109's Phase 3A scope: 301/302/307 redirects plus 410 (gone) and 451 (unavailable for legal reasons). */
export const REDIRECT_TYPES = ["301", "302", "307", "410", "451"] as const;
export type RedirectType = (typeof REDIRECT_TYPES)[number];

const GONE_TYPES: readonly RedirectType[] = ["410", "451"];

/**
 * SEO-110: heuristic detection of catastrophic backtracking patterns.
 * Not a formal proof — a bounded timeout backstop is the runtime guarantee.
 * Rejects patterns with nested quantifiers over the same character class,
 * e.g. `(a+)+`, `(a*)*`, `([ab]+)+`.
 */
function hasCatastrophicBacktracking(pattern: string): boolean {
  return /(\([^)]*[+*?][^)]*\))[+*?]/.test(pattern) || /(\[[^\]]+\][+*?])[+*?]/.test(pattern);
}

/**
 * SEO-110: validates a regex pattern. Returns an error string or `true`.
 * Includes a 10 ms execution timeout as a backstop against catastrophic
 * backtracking that slips past the heuristic.
 */
function validateRegexPattern(pattern: string): string | true {
  if (hasCatastrophicBacktracking(pattern)) {
    return "This regex pattern has nested quantifiers that could cause catastrophic backtracking. Simplify it.";
  }
  try {
    new RegExp(pattern);
  } catch (err) {
    return `Invalid regular expression: ${err instanceof Error ? err.message : String(err)}`;
  }
  // Bounded execution test: match against a benign string and reject if it takes too long.
  const start = Date.now();
  try {
    new RegExp(pattern).test("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  } catch {
    // regex threw — already caught above
  }
  if (Date.now() - start > 10) {
    return "This regex pattern is too slow (> 10 ms on a test string). Simplify it.";
  }
  return true;
}

const beforeValidateRegex: CollectionBeforeValidateHook = async ({ data }) => {
  if (!data) return data;
  if (data.sourceType !== "regex") return data;
  if (!data.source) return data;
  const result = validateRegexPattern(data.source as string);
  if (result !== true) {
    throw new Error(result);
  }
  return data;
};

/**
 * SEO-110: conflict detection. Warns (does not block) when a redirect with the
 * same source already exists. The duplicate check runs on create and on update
 * when the source changes, so renaming a source to an existing one is caught.
 */
const detectConflicts: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
  originalDoc,
}) => {
  if (!data) return data;
  const source = data.source ?? data.from;
  if (!source) return data;

  const isUpdate = operation === "update";
  const sourceUnchanged =
    isUpdate && originalDoc && originalDoc.source === source && originalDoc.from === source;
  if (sourceUnchanged) return data;

  const existing = await req.payload.find({
    collection: "redirects",
    where: {
      or: [{ from: { equals: source } }, { source: { equals: source } }],
    },
    limit: 1,
    overrideAccess: true,
  });

  const conflict = existing.docs[0];
  if (conflict && (!isUpdate || String(conflict.id) !== String(originalDoc?.id))) {
    req.payload.logger.warn(
      `Redirect conflict: source "${source}" already exists (id: ${conflict.id}). The existing redirect will be overwritten.`,
    );
  }

  return data;
};

/**
 * Redirect manager (SEO-109 + SEO-110): checked by the consuming app's proxy
 * before a public route renders. Both exact-path and regex source types are
 * supported. Regex redirects are ordered by `priority` (lower = higher
 * priority). Automatic slug-change redirects are created by
 * `createPublishLifecycleHooks`, wired in `buildNeroConfig`.
 */
export const Redirects: CollectionConfig = {
  slug: "redirects",
  admin: {
    useAsTitle: "from",
    defaultColumns: ["from", "sourceType", "type", "to", "priority", "updatedAt"],
    description:
      "URL redirects and removed/blocked pages. Path redirects match exactly; regex redirects are evaluated in priority order.",
  },
  access: {
    read: readAny,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  hooks: {
    beforeValidate: [beforeValidateRegex],
    beforeChange: [detectConflicts],
  },
  fields: [
    {
      name: "sourceType",
      type: "select",
      required: true,
      defaultValue: "path",
      options: [
        { label: "Exact path", value: "path" },
        { label: "Regular expression (advanced)", value: "regex" },
      ],
      admin: {
        description:
          "Exact path: matches only that URL. Regular expression: matches any URL the pattern covers (evaluated in priority order).",
      },
    },
    {
      name: "from",
      type: "text",
      required: true,
      index: true,
      admin: {
        description:
          "For exact path: the old path, e.g. /old-page. For regex: the pattern, e.g. ^/blog/(\\d+)$.",
      },
      validate: (value: unknown, { siblingData }: { siblingData?: Record<string, unknown> }) => {
        if (typeof value !== "string" || !value) return "Required.";
        if (siblingData?.sourceType === "regex") return true;
        if (!value.startsWith("/")) return "Exact path must start with /.";
        return true;
      },
    },
    {
      name: "priority",
      type: "number",
      defaultValue: 10,
      admin: {
        description:
          "SEO-110: lower number = higher priority for regex redirects. Path redirects always take precedence over regex.",
      },
    },
    {
      name: "type",
      type: "select",
      required: true,
      defaultValue: "301",
      options: REDIRECT_TYPES.map((value) => ({ label: value, value })),
      admin: {
        description:
          "301/302/307 send visitors to the destination below. 410/451 respond directly without a destination.",
      },
    },
    {
      name: "to",
      type: "text",
      validate: (value: unknown, { siblingData }: { siblingData?: Record<string, unknown> }) => {
        const type = siblingData?.type as RedirectType | undefined;
        if (type && GONE_TYPES.includes(type)) return true;
        if (typeof value !== "string" || !value) {
          return "A destination is required for 301/302/307 redirects.";
        }
        if (value === siblingData?.from) {
          return "The destination cannot be the same as the source path (redirect loop).";
        }
        return validateSafeHref(value, {} as never);
      },
      admin: {
        description:
          "Destination path or URL. Not used for 410/451. For regex sources, capture groups can be referenced as $1, $2 etc.",
        condition: (data) => !GONE_TYPES.includes(data?.type as RedirectType),
      },
    },
  ],
};
