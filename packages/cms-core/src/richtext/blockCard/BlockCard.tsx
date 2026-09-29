"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { FocusEvent, ReactNode } from "react";
import { RenderFields } from "@payloadcms/ui";
import { useBlockComponentContext } from "@payloadcms/richtext-lexical/client";
import { useLexicalEditable } from "@lexical/react/useLexicalEditable";
import { useInspectorContext } from "../inspector/InspectorContext";

export interface BlockCardOptions {
  icon: ReactNode;
  label: string;
}

/**
 * Builds a Gutenberg-style card for one catalog block: an icon + label
 * header, collapsed by default and expanding while a field inside has
 * focus, instead of a bare field list. Used only as `admin.components.Block`
 * on the variant of the catalog inserted inline into a body/content editor
 * (see `registry.ts`) — never on the shared `blockCatalog` objects the
 * `layout` field also uses, since a native `type: "blocks"` field's own
 * `admin.components.Block` contract is different and this component would
 * not work there.
 *
 * Reads everything it needs from `useBlockComponentContext()` — the same
 * context Payload's own default (non-custom) block rendering uses — rather
 * than assembling the block's form itself, so error display and the
 * remove button stay wired exactly as Payload provides them. Only the
 * header (icon + label instead of a generic pill) and the collapse
 * behavior (focus-driven instead of a doc-preference toggle) are ours.
 *
 * The block's own field form (`RenderFields`) is portaled into the
 * inspector panel (`InspectorPanel.tsx`) rather than rendered inline —
 * "settings for the currently selected block" live in the right-hand
 * panel, matching what was asked for the inspector. The portal keeps the
 * fields inside *this* block's own Form context (`useBlockComponentContext`
 * is only valid here), it just relocates their rendered DOM into the
 * panel. If no `InspectorProvider` is present — an editor built with
 * `BlocksFeature` but without `InspectorFeature()` — the fields render
 * inline in the card instead, so a block never becomes uneditable.
 *
 * Focus, not Lexical's own node-selection state, drives expand/collapse:
 * `BlocksNode`'s decorated content doesn't wire itself into Lexical's
 * click-to-select model, so `useLexicalNodeSelection` would not reliably
 * reflect "an editor is working inside this block". Tracking DOM focus
 * within the card is what actually mirrors "expand on focus, collapse
 * when not focused" as asked.
 */
export function createBlockCard({ icon, label }: BlockCardOptions) {
  function BlockCard() {
    const { BlockCollapsible, formSchema } = useBlockComponentContext();
    const isEditable = useLexicalEditable();
    const [isFocused, setIsFocused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const { panelElement, setActiveBlock } = useInspectorContext();

    const handleFocusCapture = useCallback(() => setIsFocused(true), []);
    const handleBlurCapture = useCallback((event: FocusEvent<HTMLDivElement>) => {
      const nextFocusTarget = event.relatedTarget as Node | null;
      if (!nextFocusTarget || !containerRef.current?.contains(nextFocusTarget)) {
        setIsFocused(false);
      }
    }, []);

    useEffect(() => {
      if (!isFocused) return;
      setActiveBlock({ icon, label });
      return () => setActiveBlock(null);
    }, [isFocused, setActiveBlock]);

    const fields = (
      <RenderFields
        fields={formSchema}
        forceRender
        parentIndexPath=""
        parentPath=""
        parentSchemaPath=""
        permissions
        readOnly={!isEditable}
      />
    );

    return (
      <div
        ref={containerRef}
        className="nero-block-card"
        onFocusCapture={handleFocusCapture}
        onBlurCapture={handleBlurCapture}
      >
        <BlockCollapsible
          editButton={false}
          Label={
            <span className="nero-block-card__label">
              <span className="nero-block-card__icon">{icon}</span>
              <span className="nero-block-card__text">{label}</span>
            </span>
          }
          collapsibleProps={{
            isCollapsed: !isFocused,
            onToggle: (next: boolean) => setIsFocused(!next),
          }}
        >
          {isFocused && panelElement ? createPortal(fields, panelElement) : fields}
        </BlockCollapsible>
      </div>
    );
  }

  BlockCard.displayName = `BlockCard(${label})`;
  return BlockCard;
}
