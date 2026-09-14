import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

/**
 * Roles and access simulation — the bodies that decide what a role grants and
 * what a given person would be able to do.
 *
 * `GET /roles` is KEYSET paginated and adds two computed fields the bare role
 * row does not carry (`permissionCount`, `memberCount`); `GET /roles/:roleId`
 * returns the unprojected row and therefore has NEITHER. They are two shapes,
 * so they are two contracts.
 *
 * `memberCount` comes from a raw `count(distinct …)` subquery, which the driver
 * hands back as a STRING — the service's `Number()` wrap is load-bearing, and
 * this contract is what fails if it is ever removed.
 *
 * On `/roles/simulate/:targetUserId` a scope of `"none"` is filtered out before
 * the response is built, so the scope map never contains it even though `none`
 * is a valid `DataScope` elsewhere.
 */

export const simulatedScopeContract = z.enum(["all", "team", "own"]);

const roleBaseShape = {
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  rank: z.number(),
  orgId: z.string(),
  version: z.number(),
  isSystem: z.boolean(),
  moduleKey: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  description: z.string().nullable(),
};

export const roleContract = z.object(roleBaseShape);

export const roleListItemContract = z.object({
  ...roleBaseShape,
  permissionCount: z.number(),
  memberCount: z.number(),
});

export const rolesPageContract = cursorPageContract(roleListItemContract);

export const simulationCandidateContract = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  image: z.string().nullable(),
  designation: z.string().nullable(),
});

export const simulationCandidatesPageContract = cursorPageContract(
  simulationCandidateContract,
);

/**
 * A source scope may be `none` even though the effective one never is: a role
 * grant pinned to `none` still appears in the provenance of a key another path
 * broadened. Only the resolved scope is filtered.
 */
export const grantSourceScopeContract = z.enum(["all", "team", "own", "none"]);

export const grantSourceKindContract = z.enum([
  "org-standing",
  "universal-member",
  "employee-self-service",
  "role-grant",
  "role-default",
  "delegation",
  "user-grant",
  "module-ownership",
  "platform-capability",
  "access-view-implication",
]);

export const grantSourceContract = z.object({
  kind: grantSourceKindContract,
  label: z.string(),
  scope: grantSourceScopeContract,
  moduleKey: z.string().nullable(),
  expiresAt: z.string().nullable(),
});

export const explainedPermissionContract = z.object({
  permissionKey: z.string(),
  moduleKey: z.string(),
  scope: simulatedScopeContract,
  expiresAt: z.string().nullable(),
  sources: z.array(grantSourceContract),
});

export const moduleStandingContract = z.enum([
  "owner",
  "admin",
  "member",
  "none",
]);

export const explainedModuleStandingContract = z.object({
  moduleKey: z.string(),
  standing: moduleStandingContract,
  available: z.boolean(),
  permissionCount: z.number(),
});

export const orgStandingContract = z.enum(["OWNER", "ORG_ADMIN", "MEMBER"]);

export const simulatedAccessContract = z.object({
  userId: z.string(),
  permissions: z.array(z.string()),
  scopes: z.record(z.string(), simulatedScopeContract),
  isOrgOwner: z.boolean(),
  standing: orgStandingContract,
  provenance: z.array(explainedPermissionContract),
  moduleStandings: z.array(explainedModuleStandingContract),
});

export type GrantSource = z.infer<typeof grantSourceContract>;
export type GrantSourceKind = z.infer<typeof grantSourceKindContract>;
export type ExplainedPermission = z.infer<typeof explainedPermissionContract>;
export type ExplainedModuleStanding = z.infer<
  typeof explainedModuleStandingContract
>;
export type OrgStanding = z.infer<typeof orgStandingContract>;
export type ModuleStandingLevel = z.infer<typeof moduleStandingContract>;

export type Role = z.infer<typeof roleContract>;
export type RoleListItem = z.infer<typeof roleListItemContract>;
export type SimulationCandidate = z.infer<typeof simulationCandidateContract>;

export type RolesPage = z.infer<typeof rolesPageContract>;
export type SimulationCandidatesPage = z.infer<
  typeof simulationCandidatesPageContract
>;
export type SimulatedAccess = z.infer<typeof simulatedAccessContract>;

export const roleSuccessContract = z.object({ success: z.literal(true) });

export const setRolePermissionsContract = z.object({
  success: z.literal(true),
  version: z.number(),
});

export const seedDefaultRolesContract = z.object({
  created: z.array(z.string()),
  skipped: z.array(z.string()),
});

export const rolePermissionGrantsContract = z.array(
  z.object({
    permissionKey: z.string(),
    scope: z.enum(["all", "team", "own", "none"]),
  }),
);

export const roleMembersContract = z.array(
  z.object({
    id: z.string(),
    principalType: z.enum(["user", "group"]),
    principalId: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    image: z.string().nullable(),
    via: z.enum(["direct", "group"]),
    groupId: z.string().nullable(),
    groupName: z.string().nullable(),
  }),
);

export const rolesAnalyticsContract = z.object({
  totalRoles: z.number(),
  customRoles: z.number(),
  systemRoles: z.number(),
  totalPermissions: z.number(),
  usersAssigned: z.number(),
  recentChanges: z.number(),
});

export const assignableDepartmentsContract = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
  }),
);
