import { z } from "zod";

export const pmWorkspaceRowContract = z.object({
  pmWorkspaceId: z.string(),
  orgId: z.string(),
  name: z.string(),
  slug: z.string(),
  isDefault: z.boolean(),
  status: z.string(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const pmWorkspacePageContract = z.object({
  data: z.array(pmWorkspaceRowContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const pmWorkspaceMemberRowContract = z.object({
  pmWorkspaceMembershipId: z.string(),
  orgId: z.string(),
  pmWorkspaceId: z.string(),
  organizationMembershipId: z.number().int(),
  role: z.string(),
  addedAt: z.string(),
  userId: z.string(),
});

export const pmWorkspaceMemberPageContract = z.object({
  data: z.array(pmWorkspaceMemberRowContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const pmWorkspacesSuccessContract = z.object({ success: z.literal(true) });
