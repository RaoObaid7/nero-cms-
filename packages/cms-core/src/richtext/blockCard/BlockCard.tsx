"use client";

import { useCallback, useRef, useState } from "react";
import type { FocusEvent, ReactNode } from "react";
import { RenderFields } from "@payloadcms/ui";
import { useBlockComponentContext } from "@payloadcms/richtext-lexical/client";
import { useLexicalEditable } from "@lexical/react/useLexicalEditable";

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
 * than assembling the block's form itself, so the field list, error
 * display and remove button all stay wired exactly as Payload provides
 * them. Only the header (icon + label instead of a generic pill) and the
 * collapse behavior (focus-driven instead of a doc-preference toggle) are
 * ours.
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

    const handleFocusCapture = useCallback(() => setIsFocused(true), []);
    const handleBlurCapture = useCallback((event: FocusEvent<HTMLDivElement>) => {
      const nextFocusTarget = event.relatedTarget as Node | null;
      if (!nextFocusTarget || !containerRef.current?.contains(nextFocusTarget)) {
        setIsFocused(false);
      }
    }, []);

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
          <RenderFields
            fields={formSchema}
            forceRender
            parentIndexPath=""
            parentPath=""
            parentSchemaPath=""
            permissions
            readOnly={!isEditable}
          />
        </BlockCollapsible>
      </div>
    );
  }

  BlockCard.displayName = `BlockCard(${label})`;
  return BlockCard;
}
