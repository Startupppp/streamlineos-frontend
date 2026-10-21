import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

export const kbPageKindSchema = z.enum(["document", "spreadsheet"]);

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
  status: z.enum(["draft", "in_review", "published", "archived"]),
  contentType: z.string(),
  kind: kbPageKindSchema,
  trustState: z.enum(["unverified", "verified", "verification_expired"]),
  visibility: z.enum(["private", "org", "public"]),
  publicToken: z.string().nullable(),
  publicSlug: z.string().nullable(),
  content: z
    .union([
      z.array(z.record(z.string(), z.unknown())),
      z.record(z.string(), z.unknown()),
    ])
    .nullable(),
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
  legalHold: z.boolean(),
  legalHoldReason: z.string().nullable(),
});

export const kbPageContract = kbPageBaseContract;

export const kbPageListItemContract = kbPageBaseContract.omit({
  content: true,
  contentText: true,
});

export const kbPageListContract = z.array(kbPageListItemContract);

export const kbFavoritePageListContract = z.object({
  data: z.array(kbPageListItemContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const kbPageWithAncestorsContract = kbPageBaseContract.extend({
  ancestors: z.array(z.object({ id: z.number().int(), title: z.string() })),
  isFavorite: z.boolean(),
  canEdit: z.boolean().optional(),
  can: z.object({
    view: z.boolean(),
    comment: z.boolean(),
    edit: z.boolean(),
    manage: z.boolean(),
    restore: z.boolean(),
  }),
  access: z.object({
    via: z.enum(["owner", "admin", "creator", "organization", "public", "space", "project", "grant"]),
    grantExpiresAt: z.string().nullable(),
  }),
});

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

export const kbPageSoftDeleteContract = z.object({
  deletedCount: z.number().int(),
});
export const kbPageEmptyTrashContract = z.object({
  purgedCount: z.number().int(),
});
export const kbPageSuccessContract = z.object({ success: z.boolean() });
export const kbPagePermanentDeleteContract = z.undefined();

export const kbPageBacklinkContract = z.object({
  id: z.number().int(),
  title: z.string(),
  icon: z.string().nullable(),
});

export const kbPageBacklinksPageContract = cursorPageContract(
  kbPageBacklinkContract,
);

const kbPageVersionItemContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  pageId: z.number().int(),
  versionNumber: z.number().int(),
  title: z.string(),
  content: z
    .union([
      z.array(z.record(z.string(), z.unknown())),
      z.record(z.string(), z.unknown()),
    ])
    .nullable(),
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

const kbWorkbookCellContract = z.object({
  r: z.number().int(),
  c: z.number().int(),
  t: z.enum(["string", "number", "boolean", "error", "empty"]).optional(),
  v: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  f: z.string().optional(),
  m: z.string().optional(),
  s: z.record(z.string(), z.unknown()).nullable().optional(),
});

const kbWorkbookSheetContract = z.object({
  id: z.string().uuid(),
  name: z.string(),
  position: z.number().int(),
  rowCount: z.number().int(),
  columnCount: z.number().int(),
  config: z.record(z.string(), z.unknown()),
  cells: z.array(kbWorkbookCellContract),
});

export const kbWorkbookContract = z.object({
  pageId: z.number().int(),
  contentRevision: z.number().int(),
  sheets: z.array(kbWorkbookSheetContract),
});

export type KbWorkbookCell = z.infer<typeof kbWorkbookCellContract>;
export type KbWorkbookSheet = z.infer<typeof kbWorkbookSheetContract>;
export type KbWorkbook = z.infer<typeof kbWorkbookContract>;

export const kbWorkbookSaveContract = z.object({
  contentRevision: z.number().int(),
  updatedAt: z.string(),
});

export const kbTrashPageListContract = z.object({
  data: z.array(kbPageListItemContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

const kbTrashDeleterContract = z.object({ membershipId: z.number().int(), name: z.string() });
export const kbTrashDeletersContract = z.object({
  data: z.array(kbTrashDeleterContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
  selected: kbTrashDeleterContract.nullable(),
});

export const kbBulkPageResultContract = z.object({
  results: z.array(
    z.object({
      pageId: z.number().int(),
      result: z.enum(["succeeded", "denied", "conflict", "notFound"]),
    }),
  ),
});

export const kbPageTrashPurgeImpactContract = z.object({
  pageCount: z.number().int(),
  descendantCount: z.number().int(),
});

export type KbPageTrashPurgeImpact = z.infer<
  typeof kbPageTrashPurgeImpactContract
>;
