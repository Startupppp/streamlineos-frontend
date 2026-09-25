import { z } from "zod";

const kbPageCommentWithAuthorContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  pageId: z.number().int(),
  authorId: z.string().nullable(),
  parentId: z.number().int().nullable(),
  content: z.string(),
  anchorBlockIndex: z.number().int().nullable(),
  anchorQuote: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  authorName: z.string().nullable(),
});

export const kbPageCommentListContract = z.array(kbPageCommentWithAuthorContract);
export const kbPageCommentContract = kbPageCommentWithAuthorContract;
