import { z } from "zod";

export const roadmapItemContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  isPublic: z.boolean(),
  projectId: z.number().int().nullable(),
  epicTicketId: z.number().int().nullable(),
  targetQuarter: z.string().nullable(),
  sortOrder: z.number().int(),
  votes: z.number().int(),
  reach: z.number().int().nullable(),
  impact: z.number().int().nullable(),
  confidence: z.number().int().nullable(),
  effort: z.number().int().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const roadmapPageContract = z.object({
  data: z.array(roadmapItemContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
  total: z.number().int().optional(),
});

export const feedbackPostContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  votes: z.number().int(),
  submittedByName: z.string().nullable(),
  submittedByEmail: z.string().nullable(),
  crmContactId: z.number().int().nullable(),
  crmOrganizationId: z.number().int().nullable(),
  linkedRoadmapItemId: z.number().int().nullable(),
  duplicateOfId: z.number().int().nullable(),
  mergedAt: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const feedbackListContract = z.array(feedbackPostContract);

export const feedbackPageContract = z.object({
  data: z.array(feedbackPostContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const changelogEntryContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  title: z.string(),
  content: z.string(),
  version: z.string().nullable(),
  isPublished: z.boolean(),
  linkedRoadmapItemId: z.number().int().nullable(),
  publishedAt: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const changelogListContract = z.array(changelogEntryContract);

export const changelogPageContract = z.object({
  data: z.array(changelogEntryContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const templateRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  createdBy: z.string().nullable(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const templateListContract = z.array(templateRowContract);

export const applyTemplateResultContract = z.object({
  project: z.object({
    id: z.number().int(),
    name: z.string(),
    key: z.string(),
  }),
  tickets: z.array(z.object({
    id: z.number().int(),
    title: z.string(),
  })),
});

export const roadmapSuccessContract = z.object({ success: z.literal(true) });
