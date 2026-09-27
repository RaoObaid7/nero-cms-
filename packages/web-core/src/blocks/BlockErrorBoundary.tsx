"use client";

import type { ReactNode } from "react";
import { catchError } from "next/error";
import type { ErrorInfo } from "next/error";

export interface BlockErrorBoundaryProps {
  blockType: string;
  index: number;
}

/**
 * `renderBlocks`' own try/catch only guards *creating* a block's element —
 * calling the registry function. A throw from inside the component's body
 * (e.g. a `@nero/ui` block component) happens later, during React's render
 * phase, and would otherwise escape all the way to the route, 500ing the
 * whole page for one bad block.
 *
 * This is deliberately built on Next's `next/error#catchError`, not a
 * hand-rolled React class component. A plain class error boundary
 * (`getDerivedStateFromError` + `componentDidCatch`) does not recover errors
 * thrown by a component during a server render pass — verified directly: a
 * minimal repro wrapping a throwing component in such a boundary and
 * rendering it with `renderToPipeableStream` still failed the whole render
 * (`onShellError`), because `componentDidCatch` never runs without a commit
 * phase and `getDerivedStateFromError` alone does not trigger recovery mid
 * server-render. `catchError` is Next's framework-aware replacement for
 * exactly this gap.
 *
 * `renderBlocks.ts` (a Server Component module) must render this component
 * by reference (`createElement(BlockErrorBoundary, props, children)`), never
 * call a plain function imported from this file — every export of a
 * `"use client"` module becomes a component reference across the
 * server/client boundary, and Next throws if server code tries to *invoke*
 * one as an ordinary function instead of rendering it. Verified directly:
 * an earlier version of this module exported a `withBlockErrorBoundary()`
 * helper function instead of the component itself, and every block silently
 * disappeared from every real page — `renderBlocks`' own catch logged
 * "Attempted to call withBlockErrorBoundary() from the server but
 * withBlockErrorBoundary is on the client" for every single block, in a real
 * `next build` + `next start` run against real Postgres.
 *
 * Props here are also deliberately plain data (`blockType`, `index`), not a
 * `logger` callback: also verified directly, passing a `{ warn: fn }` object
 * as a prop from the server into this client component throws "Functions
 * cannot be passed directly to Client Components" — the RSC serialization
 * boundary rejects function values in props, full stop. So this fallback
 * always reports through `console.warn` itself rather than accepting an
 * injected logger; `renderBlocks`' own `logger` option still applies to the
 * two failure modes that never cross that boundary (an unregistered
 * `blockType`, or a renderer that throws while building the element).
 *
 * No unit test caught either of these two bugs: Vitest executes the module
 * directly and never applies the RSC server/client transform or
 * serialization boundary that make them fail in Next itself. Both were only
 * found by running the real app end-to-end (see the E2E suite).
 */
export function BlockErrorFallback(
  props: BlockErrorBoundaryProps,
  { error }: ErrorInfo,
): ReactNode {
  console.warn("renderBlocks: skipping block that threw during render", {
    blockType: props.blockType,
    index: props.index,
    error: error instanceof Error ? error.message : String(error),
  });
  return null;
}

export const BlockErrorBoundary = catchError(BlockErrorFallback);
