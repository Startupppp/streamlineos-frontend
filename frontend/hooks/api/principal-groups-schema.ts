import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

/**
 * Principal groups are an authorization join table with a UI on top: a group
 * carries role assignments, and those roles carry permission grants. Every read
 * here was an unchecked `apiClient.get<T>` cast, so a renamed column would have
 * rendered an empty roster — which on this screen reads as "nobody holds this",
 * not as "the API changed".
 *
 * Derived from the backend projection in
 * `streamlineos-backend/src/modules/rbac/principal-groups.service.ts`:
 * `list()`, `getMembers()` and `getAssignedRoles()`. `memberCount`/`roleCount`
 * are correlated `count(*)` subqueries the service coerces with `Number(...)`,
 * so they arrive as numbers and never as the string a raw driver would emit.
 *
 * The types live here rather than beside the hooks so that the contract is the
 * single definition (root §6) and so the schema does not have to import from
 * the module that imports it — `madge --circular` is at zero in this repo.
 *
 * Not `.strict()`: an added backend field is a compatible deploy. A removed,
 * renamed or retyped one is what these reject.
 */

export const principalGroupContract = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["ORG_UNIT", "CUSTOM"]),
  orgUnitId: z.string().nullable(),
  memberCount: z.number(),
  roleCount: z.number(),
  createdAt: z.string(),
});

export type PrincipalGroup = z.infer<typeof principalGroupContract>;

export const principalGroupPageContract = cursorPageContract(
  principalGroupContract,
);

export type PaginatedGroupsResponse = {
  data: PrincipalGroup[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
};

export const principalGroupMemberContract = z.object({
  membershipId: z.number(),
  userId: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  image: z.string().nullable(),
});

export type GroupMember = z.infer<typeof principalGroupMemberContract>;

export const principalGroupMembersContract = z.array(
  principalGroupMemberContract,
);

/**
 * `rank` is the assignability ceiling the backend compares against in
 * `assertMayAssignRole`, so a dropped or restringed rank is a privilege-boundary
 * change, not a display bug.
 */
export const principalGroupRoleContract = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  rank: z.number(),
  moduleKey: z.string().nullable(),
});

export type GroupRole = z.infer<typeof principalGroupRoleContract>;

export const principalGroupRolesContract = z.array(principalGroupRoleContract);

export const principalGroupSuccessContract = z.object({
  success: z.literal(true),
});
