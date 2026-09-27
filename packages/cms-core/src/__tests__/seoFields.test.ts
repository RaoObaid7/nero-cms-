import { describe, expect, it } from "vitest";
import type { CollapsibleField, Field } from "payload";
import { seoFields } from "../fields/seo";

/** The group field is always named in practice; narrow it for the tests below. */
type NamedGroupField = { type: string; name: string; fields: Field[] };

describe("seoFields", () => {
  it("returns a single collapsible field grouping every SEO override under 'seo' by default", () => {
    const fields = seoFields();
    expect(fields).toHaveLength(1);

    const collapsible = fields[0] as CollapsibleField;
    expect(collapsible.type).toBe("collapsible");
    expect(collapsible.admin?.initCollapsed).toBe(true);

    const group = collapsible.fields[0] as unknown as NamedGroupField;
    expect(group.type).toBe("group");
    expect(group.name).toBe("seo");

    const names = group.fields.map((field) => ("name" in field ? field.name : ""));
    expect(names).toEqual([
      "metaTitle",
      "metaDescription",
      "canonicalUrl",
      "noindex",
      "nofollow",
      "ogImage",
      "focusKeyword",
      "additionalKeywords",
    ]);
  });

  it("accepts a custom group name", () => {
    const fields = seoFields({ name: "customSeo" });
    const collapsible = fields[0] as CollapsibleField;
    const group = collapsible.fields[0] as unknown as NamedGroupField;
    expect(group.name).toBe("customSeo");
  });

  it("defaults noindex and nofollow to false, so documents are indexable by default", () => {
    const fields = seoFields();
    const collapsible = fields[0] as CollapsibleField;
    const group = collapsible.fields[0] as unknown as NamedGroupField;
    const noindex = group.fields.find((field) => "name" in field && field.name === "noindex");
    const nofollow = group.fields.find((field) => "name" in field && field.name === "nofollow");
    expect(noindex && "defaultValue" in noindex ? noindex.defaultValue : undefined).toBe(false);
    expect(nofollow && "defaultValue" in nofollow ? nofollow.defaultValue : undefined).toBe(false);
  });
});
