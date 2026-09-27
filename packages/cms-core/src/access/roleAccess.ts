import type { Access, FieldAccess } from "payload";
import type { Role, RoleAwareUser } from "../roles";

function hasRole(user: RoleAwareUser | null | undefined, role: Role): boolean {
  return Boolean(user?.roles?.includes(role));
}

function asRoleAwareUser(user: unknown): RoleAwareUser | undefined {
  return (user as RoleAwareUser | null | undefined) ?? undefined;
}

function isAdminCheck({ req }: { req: { user?: unknown } }): boolean {
  return hasRole(asRoleAwareUser(req.user), "admin");
}

/** Grants access only to authenticated users with the `admin` role. */
export const isAdmin: Access = isAdminCheck;

/**
 * Field-level variant of `isAdmin`. Use this on a field's `access.create` /
 * `access.update` (e.g. `roles`) to stop a collection-level `isAdminOrSelf`
 * read/update rule from letting non-admins write admin-only fields on
 * themselves.
 */
export const isAdminField: FieldAccess = isAdminCheck;

/** Grants access to authenticated users with the `admin` or `editor` role. */
export const isAdminOrEditor: Access = ({ req }) => {
  const user = asRoleAwareUser(req.user);
  return hasRole(user, "admin") || hasRole(user, "editor");
};

/**
 * Field-level variant of `isAdminOrEditor`. Use as `access.update` on fields
 * that editors should be able to modify but public/anonymous users cannot.
 */
export const isAdminOrEditorField: FieldAccess = ({ req }) => {
  const user = asRoleAwareUser(req.user);
  return hasRole(user, "admin") || hasRole(user, "editor");
};

/**
 * Admins can access every document; any other authenticated user is scoped
 * to documents where `id` matches their own id (e.g. their own user record).
 */
export const isAdminOrSelf: Access = ({ req }) => {
  const user = asRoleAwareUser(req.user);
  if (!user) return false;
  if (hasRole(user, "admin")) return true;
  return { id: { equals: user.id } };
};

/**
 * Public visitors only see published documents (`_status: published`, set
 * automatically by Payload's draft/publish versioning). Admins and editors
 * see every document, including drafts, so the admin UI and preview flows
 * work. Scoped to those two roles rather than "any authenticated user" so
 * that adding an unrelated auth collection (e.g. customers) later doesn't
 * silently grant it draft-content read access.
 */
export const publishedOrAuthenticated: Access = ({ req }) => {
  const user = asRoleAwareUser(req.user);
  if (user && (hasRole(user, "admin") || hasRole(user, "editor"))) return true;
  return {
    _status: { equals: "published" },
  };
};

/** Anyone, including anonymous visitors, can read the document. */
export const readAny: Access = () => true;
