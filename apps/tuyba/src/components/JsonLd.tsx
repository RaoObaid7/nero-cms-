/**
 * Renders one JSON-LD `<script>` block. `<` is escaped so a value containing
 * `</script>` (e.g. editor-supplied title text) cannot break out of the
 * script context — `JSON.stringify` alone does not escape that character.
 */
export function JsonLd({ data }: { data: unknown }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
