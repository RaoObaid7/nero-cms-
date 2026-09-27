import type { CollectionConfig, PayloadRequest } from "payload";
import { isAdmin, isAdminField, isAdminOrSelf } from "../access";
import { ROLES } from "../roles";

export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  admin: {
    useAsTitle: "displayName",
    defaultColumns: ["displayName", "email", "roles", "updatedAt"],
  },
  access: {
    read: isAdminOrSelf,
    create: isAdmin,
    update: isAdminOrSelf,
    delete: isAdmin,
  },
  fields: [
    {
      name: "displayName",
      type: "text",
      admin: {
        description:
          "Public display name used in author bylines and JSON-LD schema. Leave blank to omit the author from public schema output.",
      },
    },
    {
      name: "roles",
      type: "select",
      hasMany: true,
      required: true,
      // Payload's first-user registration bypasses `create: isAdmin` via
      // `overrideAccess: true`, so this default also decides what the very
      // first account becomes. That flow has no UI path to grant admin
      // afterwards, so the first user must default to `admin` or the operator
      // is locked out. Every subsequent user defaults to `editor`: privilege
      // by default is the wrong standing behavior once an admin exists.
      defaultValue: async ({ req }: { req: PayloadRequest }): Promise<string[]> => {
        const existing = await req.payload.count({
          collection: "users",
          overrideAccess: true,
        });
        return existing.totalDocs === 0 ? ["admin"] : ["editor"];
      },
      options: ROLES.map((role) => ({ label: role, value: role })),
      saveToJWT: true,
      // Field-level access, not just the collection's `isAdminOrSelf` update
      // rule: without this, an authenticated editor could PATCH their own
      // user record with `{ "roles": ["admin"] }` and self-promote.
      access: {
        create: isAdminField,
        update: isAdminField,
      },
    },
  ],
};
