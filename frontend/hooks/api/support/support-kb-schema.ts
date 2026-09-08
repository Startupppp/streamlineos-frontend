import { z } from "zod";

export const kbCategoryRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  spaceId: z.number().nullable(),
  parentId: z.number().nullable(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  sortOrder: z.number(),
  isPublished: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const kbCategoryListContract = z.array(kbCategoryRowContract);

export const kbArticleRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  categoryId: z.number().nullable(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  status: z.enum(["draft", "in_review", "published", "archived"]),
  visibility: z.enum(["public", "internal"]),
  authorId: z.string().nullable(),
  views: z.number(),
  helpfulCount: z.number(),
  notHelpfulCount: z.number(),
  tags: z.array(z.string()),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const kbArticleListContract = z.array(kbArticleRowContract);

export const kbArticleDetailContract = z.object({
  id: z.number(),
  orgId: z.string(),
  categoryId: z.number().nullable(),
  spaceId: z.number().nullable(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  content: z.string(),
  contentText: z.string(),
  status: z.enum(["draft", "in_review", "published", "archived"]),
  visibility: z.enum(["public", "internal"]),
  authorId: z.string().nullable(),
  ownerMembershipId: z.number().nullable(),
  views: z.number(),
  helpfulCount: z.number(),
  notHelpfulCount: z.number(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  reviewIntervalDays: z.number().nullable(),
  lastVerifiedAt: z.string().nullable(),
  publishedAt: z.string().nullable(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  aclRevision: z.number(),
  contentRevision: z.number(),
  tags: z.array(z.string()),
});

export const kbFeedbackRowContract = z.object({
  id: z.number(),
  articleId: z.number(),
  helpful: z.boolean(),
  comment: z.string().nullable(),
  visitorId: z.string().nullable(),
  createdAt: z.string(),
});

export const kbFeedbackListContract = z.array(kbFeedbackRowContract);

export const kbSuccessContract = z.object({ success: z.literal(true) });

export const kbCommentRowContract = z.object({
  id: z.number().int(),
  articleId: z.number().int(),
  body: z.string(),
  userId: z.string().nullable(),
  userName: z.string().nullable(),
  userImage: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const kbCommentListContract = z.array(kbCommentRowContract);

export const kbAttachmentRowContract = z.object({
  id: z.number().int(),
  articleId: z.number().int(),
  fileName: z.string(),
  fileSize: z.number().int().nullable(),
  mimeType: z.string(),
  uploadedBy: z.string().nullable(),
  createdAt: z.string(),
});

export const kbAttachmentListContract = z.array(kbAttachmentRowContract);

export const kbAttachmentDownloadContract = z.object({
  fileName: z.string(),
  mimeType: z.string(),
  downloadUrl: z.string(),
});

export const kbIndexStatusContract = z.object({
  chunks: z.number().int(),
  lastIndexedAt: z.string().nullable(),
});

export const kbReindexArticleContract = z.object({
  chunks: z.number().int(),
  warnings: z.array(z.string()),
});

export const kbReindexAllContract = z.object({
  total: z.number().int(),
  indexed: z.number().int(),
  totalChunks: z.number().int(),
  failures: z.array(z.object({ articleId: z.number().int(), error: z.string() })),
});

/** `kbFeedbackResponseSchema` — `recorded` is false when the visitor already voted. */
export const kbPublicFeedbackContract = z.object({
  success: z.boolean(),
  recorded: z.boolean(),
});
