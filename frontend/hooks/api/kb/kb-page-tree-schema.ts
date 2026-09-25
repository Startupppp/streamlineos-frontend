import { z } from "zod";

const kbPageTreeItemSchema = z.object({
  id: z.number().int(),
  parentPageId: z.number().int().nullable(),
  spaceId: z.number().int().nullable(),
  projectId: z.number().int().nullable(),
  title: z.string(),
  icon: z.string().nullable(),
  coverImage: z.string().nullable().optional(),
  sortOrder: z.number().int().nullable(),
  visibility: z.string(),
  createdById: z.string().nullable(),
  status: z.string(),
  updatedAt: z.string().optional(),
  hasChildren: z.boolean(),
});

export const kbPageTreeLevelContract = z.object({
  data: z.array(kbPageTreeItemSchema),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export type KbPageTreeLevelPage = z.infer<typeof kbPageTreeLevelContract>;
