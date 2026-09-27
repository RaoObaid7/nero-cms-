/**
 * Media shape every block component expects, already resolved to a
 * ready-to-render image (not a Payload relationship ID or document). The
 * composing application is responsible for that resolution — `ui` has no
 * database or CMS dependency.
 */
export interface BlockMedia {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}
