
export const ROLES = {
  OWNER: "OWNER",
  ORG_ADMIN: "ORG_ADMIN",
  MEMBER: "MEMBER",
} as const;

export const ADMIN_ROLES: readonly string[] = [
  ROLES.OWNER,
  ROLES.ORG_ADMIN,
];
