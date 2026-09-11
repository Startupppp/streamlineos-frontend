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

export const simulatedAccessContract = z.object({
  userId: z.string(),
  permissions: z.array(z.string()),
  scopes: z.record(z.string(), simulatedScopeContract),
  isOrgOwner: z.boolean(),
});

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
    principalType: z.enum(["user", "department"]),
    principalId: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    image: z.string().nullable(),
    via: z.enum(["direct", "department"]),
    departmentId: z.number().nullable(),
    departmentName: z.string().nullable(),
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
    id: z.number(),
    name: z.string(),
  }),
);
