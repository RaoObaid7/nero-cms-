import type { HTMLAttributes } from "react";

/**
 * Hides content visually while keeping it in the accessibility tree, e.g. for
 * icon-only controls or extra context read by screen readers.
 */
export function VisuallyHidden({ style, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...rest}
      style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: 0,
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        border: 0,
        ...style,
      }}
    />
  );
}
