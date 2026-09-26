import { z } from "zod";

export const updateRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  projectId: z.number().int(),
  authorMembershipId: z.number().int(),
  body: z.string(),
  status: z.enum(["draft", "published"]),
  audience: z.enum(["internal", "client"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const cursorPaginationContract = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export const updatePageContract = z.object({
  data: z.array(updateRowContract),
  pagination: cursorPaginationContract,
});
