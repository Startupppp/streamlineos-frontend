import { z } from "zod";

export const announcementContract = z.object({
  id: z.number(),
  orgId: z.string(),
  title: z.string(),
  content: z.string(),
  authorId: z.string(),
  targetType: z.string(),
  isPinned: z.boolean(),
  publishAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  status: z.string(),
  readCount: z.number(),
  attachmentUrls: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  targetIds: z.array(z.string()),
});

export const announcementListContract = z.array(announcementContract);

export const announcementSuccessContract = z.object({ success: z.boolean() });
