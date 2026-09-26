import { z } from "zod";

export const kbPageSourcesEventContract = z.array(
  z.object({
    id: z.number().int(),
    title: z.string(),
    icon: z.string().nullable(),
  }),
);

export const kbAiFeedbackContract = z.object({ success: z.boolean() });

export const kbArticleWithTagsContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  categoryId: z.number().int().nullable(),
  spaceId: z.number().int().nullable(),
  ownerMembershipId: z.number().int().nullable(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  content: z.string(),
  contentText: z.string(),
  status: z.enum(["draft", "in_review", "published", "archived"]),
  visibility: z.enum(["public", "internal"]),
  authorId: z.string().nullable(),
  views: z.number().int(),
  helpfulCount: z.number().int(),
  notHelpfulCount: z.number().int(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  reviewIntervalDays: z.number().int().nullable(),
  lastVerifiedAt: z.string().nullable(),
  publishedAt: z.string().nullable(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  aclRevision: z.number().int(),
  contentRevision: z.number().int(),
  tags: z.array(z.string()),
});

export type KbArticleWithTags = z.infer<typeof kbArticleWithTagsContract>;
