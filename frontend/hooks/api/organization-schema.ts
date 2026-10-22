import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";


export const orgMemberContract = z.object({
  membershipId: z.number(),
  userId: z.string(),
  role: z.string(),
  joinedAt: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  image: z.string().nullable(),
  totpEnabled: z.boolean(),
});

export const orgMembersPageContract = cursorPageContract(orgMemberContract);

export const userOrganizationContract = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  role: z.string(),
  joinedAt: z.string().nullable(),
});

export const userOrganizationsContract = z.array(userOrganizationContract);

export const switchOrgResultContract = z.object({
  orgId: z.string(),
  name: z.string(),
  slug: z.string(),
  role: z.string(),
});

export type OrgMember = z.infer<typeof orgMemberContract>;
export type OrgMembersPage = z.infer<typeof orgMembersPageContract>;
export type UserOrganization = z.infer<typeof userOrganizationContract>;
export type SwitchOrgResult = z.infer<typeof switchOrgResultContract>;
