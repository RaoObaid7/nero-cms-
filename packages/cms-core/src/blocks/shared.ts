import type { TextFieldSingleValidation } from "payload";

/**
 * Blocks accept plain link targets only: relative paths, fragments, or
 * http/https/mailto/tel URLs. This is the field-level backstop for the PRD's
 * "no executable JavaScript inputs" rule on editor-supplied blocks.
 *
 * Allowlisted rather than denylisted on purpose. A denylist of
 * `javascript:`/`data:` is evadable, because browsers ignore control and
 * whitespace characters inside a scheme — `java\tscript:alert(1)` parses as
 * `javascript:` but does not match a naive prefix test. Stripping those
 * characters before matching, then requiring a known-good prefix, closes both
 * the obfuscation and any scheme nobody thought to denylist.
 */
export const validateSafeHref: TextFieldSingleValidation = (value) => {
  if (value === undefined || value === null || value === "") return true;

  // Remove ASCII control characters and all whitespace before inspecting the
  // scheme, mirroring how a browser normalizes a URL.
  // eslint-disable-next-line no-control-regex
  const normalized = value.replace(/[\u0000-\u0020\u007f]/g, "");
  if (normalized === "") return "Links must be a relative path or an http(s) URL.";

  const allowed = /^(\/|#|\?|https?:\/\/|mailto:|tel:)/i.test(normalized);
  if (!allowed) {
    return "Links must be a relative path or an http(s) URL.";
  }
  return true;
};
