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

export const dataScopeContract = z.enum(["all", "team", "own", "none"]);
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

export type DataScope = z.infer<typeof dataScopeContract>;
export type Role = z.infer<typeof roleContract>;
export type RoleListItem = z.infer<typeof roleListItemContract>;
export type SimulationCandidate = z.infer<typeof simulationCandidateContract>;

export type RolesPage = z.infer<typeof rolesPageContract>;
export type SimulationCandidatesPage = z.infer<
  typeof simulationCandidatesPageContract
>;
export type SimulatedAccess = z.infer<typeof simulatedAccessContract>;
