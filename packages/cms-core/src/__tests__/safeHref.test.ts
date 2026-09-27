import { describe, expect, it } from "vitest";
import { validateSafeHref } from "../blocks/shared";

/**
 * The href validator is the field-level backstop for the PRD's "no executable
 * JavaScript inputs" rule. Downstream defenses (React, Payload's Lexical HTML
 * conversion) also neutralize dangerous URLs, but this must not be the weak
 * link in that chain.
 */
function check(value: string): true | string {
  return validateSafeHref(value, {} as never) as true | string;
}

describe("validateSafeHref", () => {
  it("accepts the link shapes editors legitimately use", () => {
    for (const value of [
      "/packages/umrah",
      "/",
      "#section",
      "?page=2",
      "https://example.com/path",
      "http://example.com",
      "mailto:info@example.com",
      "tel:+901234567890",
    ]) {
      expect(check(value)).toBe(true);
    }
  });

  it("treats an empty or absent value as valid, leaving required-ness to the field", () => {
    expect(check("")).toBe(true);
    expect(validateSafeHref(undefined, {} as never)).toBe(true);
    expect(validateSafeHref(null, {} as never)).toBe(true);
  });

  it("rejects executable schemes", () => {
    for (const value of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "data:text/html;base64,PHNjcmlwdD4=",
      "vbscript:msgbox(1)",
    ]) {
      expect(check(value)).toBeTypeOf("string");
    }
  });

  it("rejects schemes obfuscated with control characters or whitespace", () => {
    // Browsers strip these before parsing the scheme, so a naive prefix test
    // would let them through while the URL still executes.
    for (const value of [
      "java\tscript:alert(1)",
      "java\nscript:alert(1)",
      "java\rscript:alert(1)",
      " javascript:alert(1)",
      "\u0001javascript:alert(1)",
      "jav\u0000ascript:alert(1)",
    ]) {
      expect(check(value)).toBeTypeOf("string");
    }
  });

  it("rejects unknown schemes rather than only the ones anyone thought to list", () => {
    for (const value of ["file:///etc/passwd", "ftp://example.com", "chrome://settings"]) {
      expect(check(value)).toBeTypeOf("string");
    }
  });
});
