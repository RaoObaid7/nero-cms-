import { describe, expect, it } from "vitest";
import { Articles, Categories, Pages, Tags } from "../collections";
import { isAdminOrEditor, publishedOrAuthenticated, readAny } from "../access";

function fieldNames(collection: typeof Pages): string[] {
  return collection.fields.map((field) => ("name" in field ? field.name : "")).filter(Boolean);
}

describe("Articles collection", () => {
  it("shares the Pages draft/publish versioning and access model", () => {
    expect(Articles.slug).toBe("articles");
    expect(Articles.versions).toEqual(Pages.versions);
    expect(Articles.access?.read).toBe(publishedOrAuthenticated);
    expect(Articles.access?.create).toBe(isAdminOrEditor);
    expect(Articles.access?.update).toBe(isAdminOrEditor);
    expect(Articles.access?.delete).toBe(isAdminOrEditor);
  });

  it("has title, excerpt, cover image, body, taxonomy, author and layout fields", () => {
    const names = fieldNames(Articles);
    expect(names).toEqual(
      expect.arrayContaining([
        "title",
        "slug",
        "excerpt",
        "coverImage",
        "body",
        "author",
        "primaryCategory",
        "additionalCategories",
        "tags",
        "layout",
        "publishAt",
      ]),
    );
  });

  it("accepts article tags as free-form text", () => {
    const tags = Articles.fields.find((field) => "name" in field && field.name === "tags");
    expect(tags).toMatchObject({ name: "tags", type: "text" });
    expect(tags && "admin" in tags && tags.admin).toMatchObject({
      components: { Field: { path: "@nero/cms-core/client#TagsField" } },
    });
  });

  it("enforces scheduled publish via a beforeChange hook", () => {
    expect(Articles.hooks?.beforeChange).toHaveLength(1);
  });
});

describe("Pages collection", () => {
  it("gained a layout blocks field and a publishAt field", () => {
    const names = fieldNames(Pages);
    expect(names).toEqual(expect.arrayContaining(["layout", "publishAt"]));
  });

  it("enforces scheduled publish via a beforeChange hook", () => {
    expect(Pages.hooks?.beforeChange).toHaveLength(1);
  });
});

describe("Categories collection", () => {
  it("is reusable, publicly readable taxonomy with an optional parent", () => {
    expect(Categories.slug).toBe("categories");
    expect(Categories.access?.read).toBe(readAny);
    expect(fieldNames(Categories)).toEqual(
      expect.arrayContaining(["name", "slug", "description", "parent"]),
    );
  });
});

describe("Tags collection", () => {
  it("is reusable, publicly readable taxonomy", () => {
    expect(Tags.slug).toBe("tags");
    expect(Tags.access?.read).toBe(readAny);
    expect(fieldNames(Tags)).toEqual(expect.arrayContaining(["name", "slug", "description"]));
  });
});
