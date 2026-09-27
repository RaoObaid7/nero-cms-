import type { BlockMedia } from "./types";

export type ImageTextLayout = "imageLeft" | "imageRight";

export interface ImageTextProps {
  media?: BlockMedia | null;
  /** Pre-rendered HTML; see `RichText` for why this is safe. */
  html: string;
  layout: ImageTextLayout;
}

export function ImageText({ media, html, layout }: ImageTextProps) {
  return (
    <section className={`nero-block nero-block--image-text nero-block--${layout}`}>
      {media?.url ? (
        <img src={media.url} alt={media.alt ?? ""} width={media.width} height={media.height} />
      ) : null}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}
