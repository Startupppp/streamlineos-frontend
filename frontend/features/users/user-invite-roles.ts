export const USER_INVITE_ROLES = [
  { value: "MEMBER", label: "Member" },
  { value: "ORG_ADMIN", label: "Org Admin" },
] as const;

/**
 * Every structural role, including OWNER.
 *
 * OWNER is filter-only: it can be selected to FIND the owner, but never
 * assigned — the backend rejects it (ownership moves through the transfer
 * flow), so it must not appear in any editor or bulk-assign control.
 */
export const USER_STRUCTURAL_ROLES = [
  { value: "OWNER", label: "Owner" },
  ...USER_INVITE_ROLES,
] as const;
