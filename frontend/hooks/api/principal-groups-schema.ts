import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";


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
