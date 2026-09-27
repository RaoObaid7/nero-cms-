/**
 * Design tokens shared by every NERO CMS consumer application.
 * Values are plain data so any renderer (CSS variables, inline styles,
 * native styling) can consume them without a runtime dependency on this package.
 */
export const colorTokens = {
  background: "#ffffff",
  foreground: "#0f172a",
  primary: "#1d4ed8",
  primaryForeground: "#ffffff",
  muted: "#64748b",
  border: "#cbd5e1",
  focusRing: "#2563eb",
  danger: "#b91c1c",
} as const;

export const spaceTokens = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2.5rem",
} as const;

export const radiusTokens = {
  sm: "0.25rem",
  md: "0.5rem",
  full: "9999px",
} as const;

export const fontTokens = {
  sans: '"Inter", system-ui, -apple-system, sans-serif',
  baseSize: "1rem",
  lineHeight: "1.5",
} as const;

export const tokens = {
  color: colorTokens,
  space: spaceTokens,
  radius: radiusTokens,
  font: fontTokens,
} as const;

export type Tokens = typeof tokens;

const toCssVariableName = (group: string, key: string): string =>
  `--nero-${group}-${key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`;

/**
 * Flattens the token tree into CSS custom property declarations, e.g.
 * `--nero-color-primary: #1d4ed8;`. Consumers decide where to mount them.
 */
export function tokensToCssVariables(source: Tokens = tokens): Record<string, string> {
  const variables: Record<string, string> = {};

  for (const [group, values] of Object.entries(source)) {
    for (const [key, value] of Object.entries(values)) {
      variables[toCssVariableName(group, key)] = value;
    }
  }

  return variables;
}
