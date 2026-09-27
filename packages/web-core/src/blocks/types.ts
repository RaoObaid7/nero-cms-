import type { ReactNode } from "react";

/** Shape of one persisted block entry, as Payload's `blocks` field stores it. */
export interface BlockData {
  blockType: string;
  [key: string]: unknown;
}

/** Renders one block's data. Registered per `blockType` in a `BlockRegistry`. */
export type BlockRenderer<TData extends BlockData = BlockData> = (data: TData) => ReactNode;

/** Maps a stable block `blockType` slug to the renderer for that block. */
export type BlockRegistry = Record<string, BlockRenderer<BlockData>>;

export interface BlockRenderLogger {
  warn(message: string, context?: Record<string, unknown>): void;
}

export interface RenderBlocksOptions {
  /** Defaults to `console.warn`. Pass a structured logger to route these into monitoring. */
  logger?: BlockRenderLogger;
}
