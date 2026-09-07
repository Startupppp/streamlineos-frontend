import { z } from "zod";

const kbPageBaseContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  spaceId: z.number().int().nullable(),
  parentPageId: z.number().int().nullable(),
  sortOrder: z.number().int().nullable(),
  projectId: z.number().int().nullable(),
  title: z.string(),
  icon: z.string().nullable(),
  coverImage: z.string().nullable(),
  status: z.string(),
  contentType: z.string(),
  trustState: z.string(),
  visibility: z.string(),
  publicToken: z.string().nullable(),
  publicSlug: z.string().nullable(),
  content: z.record(z.string(), z.unknown()).nullable(),
  contentText: z.string().nullable(),
  isLocked: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  createdByMembershipId: z.number().int().nullable(),
  lastEditedByMembershipId: z.number().int().nullable(),
  deletedByMembershipId: z.number().int().nullable(),
  ownerMembershipId: z.number().int().nullable(),
  verifiedByMembershipId: z.number().int().nullable(),
  createdById: z.string().nullable(),
  lastEditedById: z.string().nullable(),
  deletedById: z.string().nullable(),
  ownerUserId: z.string().nullable(),
  verifiedById: z.string().nullable(),
  verifiedUntil: z.string().nullable(),
  nextReviewAt: z.string().nullable(),
  aclRevision: z.number().int(),
  contentRevision: z.number().int(),
  sourceArticleId: z.number().int().nullable(),
});

export const kbPageWithAncestorsContract = kbPageBaseContract.extend({
  ancestors: z.array(z.object({ id: z.number().int(), title: z.string() })),
  isFavorite: z.boolean(),
});

export const kbPageTreeItemContract = z.object({
  id: z.number().int(),
  parentPageId: z.number().int().nullable(),
  spaceId: z.number().int().nullable(),
  projectId: z.number().int().nullable(),
  title: z.string(),
  icon: z.string().nullable(),
  sortOrder: z.number().int().nullable(),
  visibility: z.string(),
  createdById: z.string().nullable(),
  status: z.string(),
  hasChildren: z.boolean(),
});

export const kbPageTreeContract = z.array(kbPageTreeItemContract);

export const kbPageSearchResponseContract = z.object({
  items: z.array(
    z.object({
      id: z.number().int(),
      title: z.string(),
      icon: z.string().nullable(),
      snippet: z.string(),
    }),
  ),
  hasMore: z.boolean(),
  limit: z.number().int(),
});

export const kbPageSoftDeleteContract = z.object({ deletedCount: z.number().int() });
export const kbPageEmptyTrashContract = z.object({ purgedCount: z.number().int() });
export const kbPageSuccessContract = z.object({ success: z.boolean() });
export const kbPagePermanentDeleteContract = z.undefined();

export const kbPageBacklinkContract = z.array(
  z.object({ id: z.number().int(), title: z.string(), icon: z.string().nullable() }),
);

const kbPageVersionItemContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  pageId: z.number().int(),
  versionNumber: z.number().int(),
  title: z.string(),
  content: z.record(z.string(), z.unknown()).nullable(),
  contentText: z.string().nullable(),
  changeSummary: z.string().nullable(),
  authorId: z.string().nullable(),
  authorMembershipId: z.number().int().nullable(),
  authorName: z.string().nullable(),
  createdAt: z.string(),
});

export const kbPageVersionListContract = z.object({
  data: z.array(kbPageVersionItemContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const kbPageVersionContract = kbPageVersionItemContract;
