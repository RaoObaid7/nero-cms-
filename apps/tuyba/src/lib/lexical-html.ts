import { convertLexicalToHTML, defaultHTMLConverters } from "@payloadcms/richtext-lexical/html";

/**
 * Converts Payload's structured Lexical JSON into an HTML string using
 * Payload's own converter set — never a caller-supplied HTML pass-through —
 * so `dangerouslySetInnerHTML` in `@nero/ui`'s `RichText`/`ImageText`
 * components only ever renders content that went through the editor's
 * structured schema, not arbitrary markup.
 */
export function lexicalToHtml(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  return convertLexicalToHTML({
    data: data as Parameters<typeof convertLexicalToHTML>[0]["data"],
    converters: defaultHTMLConverters,
  });
}
