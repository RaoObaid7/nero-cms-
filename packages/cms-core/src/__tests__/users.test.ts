import { describe, expect, it } from "vitest";
import type { FieldAccess } from "payload";
import { Users } from "../collections/Users";
import { isAdminField } from "../access";

function requestWithUser(user: unknown): { req: { user: unknown } } {
  return { req: { user } };
}

describe("Users collection roles field access", () => {
  const rolesField = Users.fields.find((field) => "name" in field && field.name === "roles") as
    { access?: { create?: FieldAccess; update?: FieldAccess } } | undefined;

  it("wires the shared admin-only field access onto create and update", () => {
    expect(rolesField?.access?.create).toBe(isAdminField);
    expect(rolesField?.access?.update).toBe(isAdminField);
  });

  it("denies a non-admin editor from changing their own roles", async () => {
    const updateAccess = rolesField?.access?.update as FieldAccess;

    const allowed = await updateAccess(requestWithUser({ id: 1, roles: ["editor"] }) as never);

    expect(allowed).toBe(false);
  });

  it("allows an admin to change roles", async () => {
    const updateAccess = rolesField?.access?.update as FieldAccess;

    const allowed = await updateAccess(requestWithUser({ id: 1, roles: ["admin"] }) as never);

    expect(allowed).toBe(true);
  });

  it("denies role assignment on create to a non-admin", async () => {
    const createAccess = rolesField?.access?.create as FieldAccess;

    const allowed = await createAccess(requestWithUser({ id: 1, roles: ["editor"] }) as never);

    expect(allowed).toBe(false);
  });
});

describe("Users collection default role", () => {
  const rolesField = Users.fields.find((field) => "name" in field && field.name === "roles") as
    { defaultValue?: unknown } | undefined;

  function requestWithUserCount(totalDocs: number): never {
    return { req: { payload: { count: async () => ({ totalDocs }) } } } as never;
  }

  it("makes the first user an admin so the operator is not locked out", async () => {
    const defaultValue = rolesField?.defaultValue as (args: never) => Promise<string[]>;

    await expect(defaultValue(requestWithUserCount(0))).resolves.toEqual(["admin"]);
  });

  it("defaults every subsequent user to editor rather than admin", async () => {
    const defaultValue = rolesField?.defaultValue as (args: never) => Promise<string[]>;

    await expect(defaultValue(requestWithUserCount(1))).resolves.toEqual(["editor"]);
  });
});
