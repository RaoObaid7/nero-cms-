import { describe, expect, it } from "vitest";
import type { TextField } from "payload";
import { slugField } from "../fields/slugField";

function beforeValidateHook(field: TextField) {
  const hook = field.hooks?.beforeValidate?.[0];
  if (!hook) throw new Error("expected a beforeValidate hook");
  return hook;
}

describe("slugField", () => {
  it("is unique, indexed and required by default, named 'slug'", () => {
    const field = slugField();
    expect(field.name).toBe("slug");
    expect(field.type).toBe("text");
    expect(field.unique).toBe(true);
    expect(field.index).toBe(true);
    expect(field.required).toBe(true);
  });

  it("accepts a custom name and non-required override", () => {
    const field = slugField({ name: "customSlug", required: false });
    expect(field.name).toBe("customSlug");
    expect(field.required).toBe(false);
  });

  it("wires the shared live auto-fill client component, in the sidebar", () => {
    const field = slugField();
    expect(field.admin?.position).toBe("sidebar");
    const components = field.admin?.components as
      { Field?: { path?: string; clientProps?: Record<string, unknown> } } | undefined;
    expect(components?.Field?.path).toBe("@nero/cms-core/client#SlugField");
    expect(components?.Field?.clientProps).toEqual({ titleFieldPath: "title" });
  });

  it("derives titleFieldPath into the client component's clientProps", () => {
    const field = slugField({ titleFieldPath: "name" });
    const components = field.admin?.components as
      { Field?: { clientProps?: Record<string, unknown> } } | undefined;
    expect(components?.Field?.clientProps).toEqual({ titleFieldPath: "name" });
  });

  it("beforeValidate fallback: derives a slug from the title on create when none was supplied", async () => {
    const field = slugField();
    const hook = beforeValidateHook(field);
    const result = await hook({
      value: undefined,
      data: { title: "Hello World!" },
      operation: "create",
    } as never);
    expect(result).toBe("hello-world");
  });

  it("beforeValidate fallback: leaves an explicitly supplied slug untouched on create", async () => {
    const field = slugField();
    const hook = beforeValidateHook(field);
    const result = await hook({
      value: "custom-slug",
      data: { title: "Hello World!" },
      operation: "create",
    } as never);
    expect(result).toBe("custom-slug");
  });

  it("beforeValidate fallback: never generates a slug on update, even if empty", async () => {
    const field = slugField();
    const hook = beforeValidateHook(field);
    const result = await hook({
      value: undefined,
      data: { title: "Hello World!" },
      operation: "update",
    } as never);
    expect(result).toBeUndefined();
  });
});
