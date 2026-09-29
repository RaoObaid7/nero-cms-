"use client";

import { useEffect, useRef } from "react";
import { useInspectorContext } from "./InspectorContext";

/**
 * The right-hand "block settings" panel. Mounted once per editor instance
 * as a `belowContainer` plugin (see `InspectorClientFeature.tsx`) — DOM
 * position only, not visual position; a CSS pass (step 4) is what actually
 * places this to the right of the editor rather than beneath it.
 *
 * Renders an empty ref target (`panelBodyRef`); the currently focused
 * `BlockCard` portals its own field form into that node, so field state
 * stays owned by the block's own Form context (see `BlockCard.tsx`) — this
 * component never touches field values directly.
 */
export function InspectorPanel() {
  const { activeBlock, setPanelElement } = useInspectorContext();
  const panelBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPanelElement(panelBodyRef.current);
    return () => setPanelElement(null);
  }, [setPanelElement]);

  return (
    <div className="nero-block-inspector">
      <div className="nero-block-inspector__header">
        {activeBlock ? (
          <>
            <span className="nero-block-inspector__icon">{activeBlock.icon}</span>
            <span className="nero-block-inspector__label">{activeBlock.label}</span>
          </>
        ) : (
          <span className="nero-block-inspector__placeholder">
            Select a block to edit its settings.
          </span>
        )}
      </div>
      <div ref={panelBodyRef} className="nero-block-inspector__body" />
    </div>
  );
}
