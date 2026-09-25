import { z } from "zod";

export const kbSpaceListItemContract = z.object({
  id: z.number().int(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  audience: z.enum(["internal", "public", "mixed"]),
  icon: z.string().nullable(),
  isPublicHelpCenter: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  archivedAt: z.string().nullable(),
  articleCount: z.number().int(),
  pageCount: z.number().int(),
  memberCount: z.number().int(),
  ownerName: z.string().nullable(),
  pagesOverdueForReview: z.number().int(),
});

export type KbSpaceListItem = z.infer<typeof kbSpaceListItemContract>;

export const kbSpaceListPageContract = z.object({
  data: z.array(kbSpaceListItemContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export type KbSpaceListPage = z.infer<typeof kbSpaceListPageContract>;

export const kbSpaceFullContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  audience: z.enum(["internal", "public", "mixed"]),
  icon: z.string().nullable(),
  branding: z.record(z.string(), z.unknown()).nullable(),
  isPublicHelpCenter: z.boolean(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  type: z.string(),
  color: z.string().nullable(),
  defaultVisibility: z.string(),
  owningTeamId: z.string().nullable(),
  archivedAt: z.string().nullable(),
  pagesOverdueForReview: z.number().int().optional(),
  pagesWithReviewPolicy: z.number().int().optional(),
  viewerSpaceRole: z.enum(["viewer", "commenter", "editor", "publisher", "admin"]).nullable().optional(),
});

export const kbSpaceSuccessContract = z.object({ success: z.boolean() });

export const kbSpaceArchiveImpactContract = z.object({
  pageCount: z.number().int(),
  publicLinkCount: z.number().int(),
  recordLinkCount: z.number().int(),
  askIndexed: z.boolean(),
});

export type KbSpaceArchiveImpact = z.infer<typeof kbSpaceArchiveImpactContract>;

export const kbSpaceMemberContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  spaceId: z.number().int(),
  membershipId: z.number().int().nullable(),
  role: z.string().nullable(),
  team: z.string().nullable(),
  spaceRole: z.string(),
  createdAt: z.string(),
  userId: z.string().nullable(),
  userName: z.string().nullable(),
  userEmail: z.string().nullable(),
  userImage: z.string().nullable(),
});

export const kbSpaceMemberListContract = z.array(kbSpaceMemberContract);
export type KbSpaceMember = z.infer<typeof kbSpaceMemberContract>;

export const kbSettingsContract = z.object({
  trashRetentionDays: z.number().int(),
  chatHistoryRetentionDays: z.number().int(),
});

export const kbTagContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.string(),
});
