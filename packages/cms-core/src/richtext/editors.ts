import type { Block } from "payload";
import { BlocksFeature, FixedToolbarFeature, HeadingFeature, lexicalEditor } from "@payloadcms/richtext-lexical";
import type { FeatureProviderServer } from "@payloadcms/richtext-lexical";

/**
 * Heading levels offered in the body/content editor's toolbar and slash
 * menu. Carried over unchanged from Articles' pre-existing restriction
 * (see PR notes on `buildBodyEditor` below) rather than widened to the
 * richtext-lexical default of h1-h6.
 */
const BODY_HEADING_SIZES = ["h1", "h2", "h3", "h4"] as const;

/**
 * The `features` callback for `buildBodyEditor`, split out as a plain
 * function (rather than inlined into the `lexicalEditor({ features })`
 * call) so it can be unit tested directly — `lexicalEditor()` itself
 * returns an opaque async adapter provider that needs a full sanitized
 * Payload config to invoke.
 */
function bodyEditorFeatures(
  defaultFeatures: FeatureProviderServer<unknown, unknown, unknown>[],
  blocks: Block[],
) {
  return [
    ...defaultFeatures,
    HeadingFeature({ enabledHeadingSizes: [...BODY_HEADING_SIZES] }),
    FixedToolbarFeature(),
    BlocksFeature({ blocks }),
  ];
}

/**
 * The `features` callback for `buildInlineTextEditor`. See
 * `bodyEditorFeatures` for why this is split out; here it also gives
 * `__tests__/editors.test.ts` a direct, non-string-matching way to assert
 * `BlocksFeature` (key `"blocks"`) never ends up in this list.
 */
function inlineTextEditorFeatures(defaultFeatures: FeatureProviderServer<unknown, unknown, unknown>[]) {
  return [...defaultFeatures];
}

/**
 * The editor for the top-level `body`/`content` field on Articles and
 * Pages. Both collections must call this — not assemble their own feature
 * list — so they render identically and so the "no BlocksFeature inside an
 * inline block's own editor" rule (see `buildInlineTextEditor`) has exactly
 * one place it could be violated from at this level.
 *
 * Starts from Payload's own `defaultFeatures` rather than an explicit list,
 * so this picks up whatever the installed `@payloadcms/richtext-lexical`
 * version ships as default (subscript/superscript, checklist, relationship,
 * paragraph, indent, the floating inline toolbar) instead of silently
 * losing them, which is what happened when Articles previously hand-rolled
 * its own list. `HeadingFeature` and `FixedToolbarFeature` given here
 * override/add to those defaults; Payload's feature loader dedupes by
 * feature `key`, so a later entry for a key already in `defaultFeatures`
 * replaces it rather than producing two conflicting instances of the same
 * feature (`@payloadcms/richtext-lexical`'s
 * `lexical/config/server/loader.js` keys its dependency graph by
 * `feature.key`).
 *
 * `blocks` is the catalog this editor can insert inline via the "/" menu
 * and the "+" inserter, in addition to the existing `layout` blocks field.
 * Pass the same catalog used for `layout` unless a consumer deliberately
 * wants a narrower inline set.
 */
export function buildBodyEditor({ blocks }: { blocks: Block[] }) {
  return lexicalEditor({
    features: ({ defaultFeatures }) => bodyEditorFeatures(defaultFeatures, blocks),
  });
}

/**
 * The editor for a rich text field that lives *inside* a block (the Rich
 * Text block's `content` field, the Image + Text block's `content` field).
 * Deliberately excludes `BlocksFeature`: PRD section 6 forbids unlimited
 * nesting, and an editor already reached this field by inserting a block
 * into a `buildBodyEditor()` instance, so this inner editor must not offer
 * a second level of block insertion. `BlocksFeature` is opt-in in
 * `@payloadcms/richtext-lexical` (it is not part of `defaultFeatures`), so
 * omitting it here is a config-level guarantee, not a convention a future
 * edit here could silently break — see `__tests__/editors.test.ts`, which
 * asserts this.
 */
export function buildInlineTextEditor() {
  return lexicalEditor({
    features: ({ defaultFeatures }) => inlineTextEditorFeatures(defaultFeatures),
  });
}

/** Exposed only for `__tests__/editors.test.ts`. */
export const __testing = { bodyEditorFeatures, inlineTextEditorFeatures };
