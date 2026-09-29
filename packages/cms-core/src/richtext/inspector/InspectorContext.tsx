"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";

export interface ActiveBlockInfo {
  icon: ReactNode;
  label: string;
}

interface InspectorContextValue {
  activeBlock: ActiveBlockInfo | null;
  panelElement: HTMLDivElement | null;
  setActiveBlock: (block: ActiveBlockInfo | null) => void;
  setPanelElement: (element: HTMLDivElement | null) => void;
}

const InspectorContext = createContext<InspectorContextValue | null>(null);

/**
 * Registered as this editor instance's Lexical `providers` entry (see
 * `InspectorClientFeature.tsx`) — nested below `EditorConfigProvider`, so
 * every block card inside this one editor instance shares the same
 * inspector state, and a second editor instance elsewhere on the same
 * document page (a different `richText` field) gets its own, independent
 * one.
 *
 * Holds two things: which block is currently "active" (for the panel's
 * header — icon + label) and the DOM node the panel itself mounted into
 * (`panelElement`), which the active block's card portals its field form
 * into. See `BlockCard.tsx`.
 */
export function InspectorProvider({ children }: { children: ReactNode }) {
  const [activeBlock, setActiveBlock] = useState<ActiveBlockInfo | null>(null);
  const [panelElement, setPanelElement] = useState<HTMLDivElement | null>(null);

  return (
    <InspectorContext.Provider
      value={{ activeBlock, panelElement, setActiveBlock, setPanelElement }}
    >
      {children}
    </InspectorContext.Provider>
  );
}

/**
 * Throws outside an `InspectorProvider` rather than silently no-op'ing:
 * a `BlockCard` rendered without the inspector feature enabled on its
 * editor would otherwise portal its fields nowhere and appear to lose
 * them, which is worse than a clear configuration error.
 */
export function useInspectorContext(): InspectorContextValue {
  const context = useContext(InspectorContext);
  if (!context) {
    throw new Error(
      "useInspectorContext must be used within an InspectorProvider — is InspectorFeature() missing from this editor's features?",
    );
  }
  return context;
}
