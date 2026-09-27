export const ROLES = ["admin", "editor"] as const;

export type Role = (typeof ROLES)[number];

export interface RoleAwareUser {
  id: string | number;
  roles?: Role[] | null;
}
