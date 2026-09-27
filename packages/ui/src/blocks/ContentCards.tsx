import { Link } from "../components/Link";
import type { BlockMedia } from "./types";

export interface ContentCard {
  title: string;
  summary?: string;
  media?: BlockMedia | null;
  href?: string;
}

export interface ContentCardsProps {
  cards: ContentCard[];
}

export function ContentCards({ cards }: ContentCardsProps) {
  return (
    <ul className="nero-block nero-block--content-cards">
      {cards.map((card, index) => (
        <li key={index}>
          {card.media?.url ? (
            <img
              src={card.media.url}
              alt={card.media.alt ?? ""}
              width={card.media.width}
              height={card.media.height}
            />
          ) : null}
          <h3>{card.href ? <Link href={card.href}>{card.title}</Link> : card.title}</h3>
          {card.summary ? <p>{card.summary}</p> : null}
        </li>
      ))}
    </ul>
  );
}
