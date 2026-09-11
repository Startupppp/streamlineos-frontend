import { z } from "zod";

export const talentPoolListItemContract = z.object({
  id: z.number().int(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  memberCount: z.number().int(),
});

export const talentPoolListContract = z.array(talentPoolListItemContract);

export const talentPoolRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const talentPoolMemberContract = z.object({
  membershipId: z.number().int(),
  notes: z.string().nullable(),
  addedAt: z.string(),
  candidateId: z.number().int(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  currentCompany: z.string().nullable(),
  currentRole: z.string().nullable(),
  status: z.string(),
});

export const talentPoolMembersPageContract = z.object({
  data: z.array(talentPoolMemberContract),
  pagination: z.object({
    limit: z.number().int(),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});

export const talentPoolMemberRowContract = z.object({
  id: z.number().int(),
  poolId: z.number().int(),
  candidateId: z.number().int(),
  orgId: z.string(),
  notes: z.string().nullable(),
  addedBy: z.string().nullable(),
  addedAt: z.string(),
});
