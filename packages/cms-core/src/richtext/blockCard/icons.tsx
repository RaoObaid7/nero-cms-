import type { ReactElement, SVGProps } from "react";

/**
 * One small line-icon per catalog block, used in the block card header
 * (`BlockCard.tsx`). Deliberately simple shapes, not brand art — visual
 * polish is step 4's job; these exist so step 2's cards have a distinct
 * icon per block, as asked.
 */
const iconProps: SVGProps<SVGSVGElement> = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export function HeroIcon(): ReactElement {
  return (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M3 15l5-4 4 3 4-5 5 4" />
    </svg>
  );
}

export function RichTextIcon(): ReactElement {
  return (
    <svg {...iconProps}>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}

export function ImageTextIcon(): ReactElement {
  return (
    <svg {...iconProps}>
      <rect x="3" y="5" width="8" height="14" rx="1" />
      <path d="M14 8h7M14 12h7M14 16h5" />
    </svg>
  );
}

export function GalleryIcon(): ReactElement {
  return (
    <svg {...iconProps}>
      <rect x="3" y="4" width="13" height="13" rx="1" />
      <rect x="8" y="9" width="13" height="13" rx="1" />
    </svg>
  );
}

export function CalloutIcon(): ReactElement {
  return (
    <svg {...iconProps}>
      <path d="M7 8c-2 1-3 2.5-3 4.5S5.5 16 7 16" />
      <path d="M15 8c-2 1-3 2.5-3 4.5s1.5 3.5 3 3.5" />
    </svg>
  );
}

export function ContentCardsIcon(): ReactElement {
  return (
    <svg {...iconProps}>
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="8" rx="1" />
      <rect x="3" y="13" width="8" height="8" rx="1" />
      <rect x="13" y="13" width="8" height="8" rx="1" />
    </svg>
  );
}

export function FaqIcon(): ReactElement {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function CtaIcon(): ReactElement {
  return (
    <svg {...iconProps}>
      <rect x="3" y="8" width="18" height="8" rx="4" />
      <path d="M12 11v2" />
    </svg>
  );
}
