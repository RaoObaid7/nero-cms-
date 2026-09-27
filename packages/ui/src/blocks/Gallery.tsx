import type { BlockMedia } from "./types";

export interface GalleryImage {
  media?: BlockMedia | null;
  caption?: string;
}

export interface GalleryProps {
  images: GalleryImage[];
}

export function Gallery({ images }: GalleryProps) {
  return (
    <ul className="nero-block nero-block--gallery">
      {images.map((image, index) => (
        <li key={index}>
          {image.media?.url ? (
            <img
              src={image.media.url}
              alt={image.media.alt ?? ""}
              width={image.media.width}
              height={image.media.height}
            />
          ) : null}
          {image.caption ? <figcaption>{image.caption}</figcaption> : null}
        </li>
      ))}
    </ul>
  );
}
