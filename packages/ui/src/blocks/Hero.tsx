import { Link } from "../components/Link";
import type { BlockMedia } from "./types";

export interface HeroProps {
  heading: string;
  subheading?: string;
  media?: BlockMedia | null;
  cta?: { label?: string; href?: string } | null;
}

/** Page-opening banner. The heading is an H2 — templates own the page's H1. */
export function Hero({ heading, subheading, media, cta }: HeroProps) {
  return (
    <section className="nero-block nero-block--hero">
      {media?.url ? (
        <img
          className="nero-block__media"
          src={media.url}
          alt={media.alt ?? ""}
          width={media.width}
          height={media.height}
        />
      ) : null}
      <h2>{heading}</h2>
      {subheading ? <p>{subheading}</p> : null}
      {cta?.href && cta?.label ? <Link href={cta.href}>{cta.label}</Link> : null}
    </section>
  );
}
