export const ORG_OWNER_ROLE = "OWNER";

export const USER_INVITE_ROLES = [
  { value: "MEMBER", label: "Member" },
  { value: "ORG_ADMIN", label: "Org Admin" },
] as const;

export type UserInviteRole = (typeof USER_INVITE_ROLES)[number]["value"];

export const USER_INVITE_ROLE_VALUES = USER_INVITE_ROLES.map((role) => role.value);

export function isUserInviteRole(value: string): value is UserInviteRole {
  return USER_INVITE_ROLE_VALUES.some((role) => role === value);
}

export const DEFAULT_INVITE_ROLE = "MEMBER";

export const USER_STRUCTURAL_ROLES = [
  { value: "OWNER", label: "Owner" },
  ...USER_INVITE_ROLES,
] as const;

const STRUCTURAL_ROLE_LABELS: ReadonlyMap<string, string> = new Map(
  USER_STRUCTURAL_ROLES.map((role) => [role.value, role.label]),
);

export function formatRoleLabel(slug: string): string {
  const known = STRUCTURAL_ROLE_LABELS.get(slug);
  if (known !== undefined) return known;
  return slug
    .split("_")
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export type StructuralRole = (typeof USER_STRUCTURAL_ROLES)[number]["value"];

export function toStructuralRole(value: string | null | undefined): StructuralRole {
  return USER_STRUCTURAL_ROLES.find((r) => r.value === value)?.value ?? "MEMBER";
}
