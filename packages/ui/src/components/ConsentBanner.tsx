"use client";

import type { ReactNode } from "react";
import { colorTokens, spaceTokens, radiusTokens } from "../tokens";

export interface ConsentBannerProps {
  onGrant: () => void;
  onDeny: () => void;
  /** Custom message text. Falls back to a sensible default. */
  message?: ReactNode;
}

/**
 * Minimal, accessible consent banner. Does not collect or display any PII.
 * Renders the grant/deny controls only — styling is intentionally minimal so
 * consuming apps can wrap or replace it freely.
 */
export function ConsentBanner({ onGrant, onDeny, message }: ConsentBannerProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cookie and analytics consent"
      style={{
        position: "fixed",
        bottom: spaceTokens.lg,
        left: spaceTokens.lg,
        right: spaceTokens.lg,
        maxWidth: "36rem",
        background: colorTokens.background,
        border: `1px solid ${colorTokens.border}`,
        borderRadius: radiusTokens.md,
        padding: spaceTokens.lg,
        boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
        zIndex: 9999,
      }}
    >
      <p
        id="consent-description"
        style={{
          margin: `0 0 ${spaceTokens.md}`,
          color: colorTokens.foreground,
          fontSize: "0.9rem",
        }}
      >
        {message ?? "We use analytics cookies to improve this site. You can accept or decline."}
      </p>
      <div style={{ display: "flex", gap: spaceTokens.sm }}>
        <button
          type="button"
          onClick={onGrant}
          style={{
            background: colorTokens.primary,
            color: colorTokens.primaryForeground,
            border: "none",
            borderRadius: radiusTokens.sm,
            padding: `${spaceTokens.sm} ${spaceTokens.md}`,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.875rem",
          }}
        >
          Accept
        </button>
        <button
          type="button"
          onClick={onDeny}
          style={{
            background: "transparent",
            color: colorTokens.foreground,
            border: `1px solid ${colorTokens.border}`,
            borderRadius: radiusTokens.sm,
            padding: `${spaceTokens.sm} ${spaceTokens.md}`,
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          Decline
        </button>
      </div>
    </div>
  );
}
