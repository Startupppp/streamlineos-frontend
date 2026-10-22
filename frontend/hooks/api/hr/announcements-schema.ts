import { z } from "zod";

export const announcementTargetTypeContract = z.enum([
  "ALL",
  "DEPARTMENT",
  "BRANCH",
  "ROLE",
]);

export const announcementStatusContract = z.enum([
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "EXPIRED",
]);

export type AnnouncementTargetType = z.infer<typeof announcementTargetTypeContract>;
export type AnnouncementStatus = z.infer<typeof announcementStatusContract>;

export const announcementContract = z.object({
  id: z.number(),
  orgId: z.string(),
  title: z.string(),
  content: z.string(),
  authorId: z.string(),
  targetType: announcementTargetTypeContract,
  isPinned: z.boolean(),
  publishAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  status: announcementStatusContract,
  readCount: z.number(),
  attachmentUrls: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  targetIds: z.array(z.string()),
});

export const announcementListContract = z.array(announcementContract);

export const announcementSuccessContract = z.object({ success: z.boolean() });
