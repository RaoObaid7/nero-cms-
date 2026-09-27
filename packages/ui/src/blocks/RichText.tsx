export interface RichTextProps {
  /** Pre-rendered HTML. The composing app converts Lexical JSON to HTML before this component ever sees it. */
  html: string;
}

/**
 * `dangerouslySetInnerHTML` is safe here specifically because `html` is
 * produced by Payload's own Lexical-to-HTML conversion from structured
 * editor content, not passed through from arbitrary user/API input.
 */
export function RichText({ html }: RichTextProps) {
  return (
    <div className="nero-block nero-block--rich-text" dangerouslySetInnerHTML={{ __html: html }} />
  );
}
