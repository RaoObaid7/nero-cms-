import { describe, expect, it } from "vitest";
import { tokens, tokensToCssVariables } from "../tokens";

describe("tokensToCssVariables", () => {
  it("flattens every token group into a --nero-<group>-<key> CSS variable", () => {
    const variables = tokensToCssVariables(tokens);

    expect(variables["--nero-color-primary"]).toBe(tokens.color.primary);
    expect(variables["--nero-space-md"]).toBe(tokens.space.md);
    expect(variables["--nero-radius-full"]).toBe(tokens.radius.full);
  });

  it("kebab-cases camelCase token keys", () => {
    const variables = tokensToCssVariables(tokens);

    expect(variables["--nero-color-primary-foreground"]).toBe(tokens.color.primaryForeground);
    expect(variables["--nero-color-primaryForeground"]).toBeUndefined();
  });
});
