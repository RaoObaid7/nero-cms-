import { describe, expect, it } from "vitest";
import type { PayloadRequest } from "payload";
import { isAdmin, isAdminOrEditor, publishedOrAuthenticated } from "../access";

function requestWithUser(user: unknown): { req: PayloadRequest } {
  return { req: { user } as PayloadRequest };
}

describe("role access helpers", () => {
  it("grants isAdmin only to users with the admin role", () => {
    expect(isAdmin(requestWithUser({ id: 1, roles: ["admin"] }) as never)).toBe(true);
    expect(isAdmin(requestWithUser({ id: 2, roles: ["editor"] }) as never)).toBe(false);
    expect(isAdmin(requestWithUser(null) as never)).toBe(false);
  });

  it("grants isAdminOrEditor to either role", () => {
    expect(isAdminOrEditor(requestWithUser({ id: 1, roles: ["editor"] }) as never)).toBe(true);
    expect(isAdminOrEditor(requestWithUser(null) as never)).toBe(false);
  });

  it("lets admins and editors read every page but restricts anonymous or other authenticated users to published documents", () => {
    expect(publishedOrAuthenticated(requestWithUser({ id: 1, roles: ["editor"] }) as never)).toBe(
      true,
    );
    expect(publishedOrAuthenticated(requestWithUser({ id: 2, roles: ["admin"] }) as never)).toBe(
      true,
    );
    expect(publishedOrAuthenticated(requestWithUser({ id: 3, roles: [] }) as never)).toEqual({
      _status: { equals: "published" },
    });
    expect(publishedOrAuthenticated(requestWithUser(null) as never)).toEqual({
      _status: { equals: "published" },
    });
  });
});
