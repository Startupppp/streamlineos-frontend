import { z } from "zod";

export const teamRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  key: z.string(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  isPrivate: z.boolean(),
  capacity: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const teamListItemContract = teamRowContract
  .omit({ deletedAt: true })
  .extend({ memberCount: z.number().int() });

export const teamPageContract = z.object({
  data: z.array(teamListItemContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const teamDetailContract = teamRowContract.extend({
  members: z.array(z.object({
    userId: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
    role: z.string(),
  })),
});

export const teamMemberRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  teamId: z.number().int(),
  membershipId: z.number().int(),
  role: z.string(),
  joinedAt: z.string(),
});

export const teamMemberItemContract = z.object({
  id: z.number().int(),
  userId: z.string(),
  role: z.string(),
  joinedAt: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string(),
  image: z.string().nullable(),
});

export const teamMemberPageContract = z.object({
  data: z.array(teamMemberItemContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const teamProjectItemContract = z.object({
  id: z.number().int(),
  name: z.string(),
  key: z.string(),
  status: z.string(),
  addedAt: z.string(),
});

export const teamProjectItemListContract = z.array(teamProjectItemContract);

export const teamProjectRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  projectId: z.number().int(),
  teamId: z.number().int(),
  addedAt: z.string(),
});

export const teamsSuccessContract = z.object({ success: z.literal(true) });

export type TeamMemberItem = z.infer<typeof teamMemberItemContract>;
export type TeamMemberPage = z.infer<typeof teamMemberPageContract>;
