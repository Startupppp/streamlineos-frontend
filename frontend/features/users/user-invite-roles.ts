export const ORG_OWNER_ROLE = "OWNER";

export const USER_INVITE_ROLES = [
  { value: "MEMBER", label: "Member" },
  { value: "ORG_ADMIN", label: "Org Admin" },
] as const;


export const USER_STRUCTURAL_ROLES = [
  { value: "OWNER", label: "Owner" },
  ...USER_INVITE_ROLES,
] as const;
