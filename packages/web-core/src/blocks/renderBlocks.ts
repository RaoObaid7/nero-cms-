import { createElement } from "react";
import type { ReactNode } from "react";
import { BlockErrorBoundary } from "./BlockErrorBoundary";
import type { BlockData, BlockRegistry, BlockRenderLogger, RenderBlocksOptions } from "./types";

const defaultLogger: BlockRenderLogger = {
  warn: (message, context) => {
    console.warn(message, context ?? {});
  },
};

/**
 * Renders a document's `layout` blocks against a registry, skipping and
 * logging instead of throwing whenever a block cannot be rendered — an
 * unregistered `blockType` (e.g. content authored against a newer or
 * project-specific catalog than the one currently deployed), a registered
 * renderer that throws while building the element, or a component that
 * throws later, during React's own render phase (each block's element is
 * wrapped in a `BlockErrorBoundary` for this). A page with one bad block
 * still renders every other block; nothing is lost silently, since every
 * skip is logged with enough context (`blockType`, index) to investigate.
 */
export function renderBlocks<TData extends BlockData = BlockData>(
  blocks: readonly TData[] | null | undefined,
  registry: BlockRegistry,
  options: RenderBlocksOptions = {},
): ReactNode[] {
  const logger = options.logger ?? defaultLogger;
  if (!blocks || blocks.length === 0) return [];

  const rendered: ReactNode[] = [];

  blocks.forEach((block, index) => {
    const renderer = registry[block.blockType];
    if (!renderer) {
      logger.warn("renderBlocks: skipping unregistered block type", {
        blockType: block.blockType,
        index,
      });
      return;
    }

    try {
      const element = renderer(block);
      // Rendered by reference, not called as a function, and with plain-data
      // props only (no `logger`) — see `BlockErrorBoundary`'s doc comment for
      // why either mistake breaks silently in a real Next.js build but not
      // under Vitest.
      rendered.push(
        createElement(
          BlockErrorBoundary,
          { key: `block-${index}`, blockType: block.blockType, index },
          element,
        ),
      );
    } catch (error) {
      logger.warn("renderBlocks: skipping block that failed to render", {
        blockType: block.blockType,
        index,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return rendered;
}
