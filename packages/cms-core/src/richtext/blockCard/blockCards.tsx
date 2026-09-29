"use client";

import { createBlockCard } from "./BlockCard";
import {
  CalloutIcon,
  ContentCardsIcon,
  CtaIcon,
  FaqIcon,
  GalleryIcon,
  HeroIcon,
  ImageTextIcon,
  RichTextIcon,
} from "./icons";

/**
 * One named export per catalog block, registered by `registry.ts` as that
 * block's `admin.components.Block` via the
 * `"@nero/cms-core/client#<Export>"` import-map path convention. Payload
 * resolves `admin.components.Block` by string path, so this cannot be a
 * single parameterized component — each block needs its own stable export
 * name.
 */
export const HeroBlockCard = createBlockCard({ icon: <HeroIcon />, label: "Hero" });
export const RichTextBlockCard = createBlockCard({ icon: <RichTextIcon />, label: "Rich Text" });
export const ImageTextBlockCard = createBlockCard({
  icon: <ImageTextIcon />,
  label: "Image + Text",
});
export const GalleryBlockCard = createBlockCard({ icon: <GalleryIcon />, label: "Gallery" });
export const CalloutBlockCard = createBlockCard({ icon: <CalloutIcon />, label: "Callout" });
export const ContentCardsBlockCard = createBlockCard({
  icon: <ContentCardsIcon />,
  label: "Content Cards",
});
export const FaqBlockCard = createBlockCard({ icon: <FaqIcon />, label: "FAQ" });
export const CtaBlockCard = createBlockCard({ icon: <CtaIcon />, label: "CTA" });
