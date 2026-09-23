export type KbPage = {
  id: number;
  orgId: string;
  spaceId: number | null;
  parentPageId: number | null;
  sortOrder: number | null;
  projectId: number | null;
  title: string;
  icon: string | null;
  coverImage: string | null;
  status: "draft" | "in_review" | "published" | "archived";
  contentType: string;
  trustState: "unverified" | "verified" | "verification_expired";
  visibility: "private" | "org" | "public";
  publicToken: string | null;
  publicSlug: string | null;
  content: Record<string, unknown>[] | Record<string, unknown> | null;
  contentText: string | null;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdByMembershipId: number | null;
  lastEditedByMembershipId: number | null;
  deletedByMembershipId: number | null;
  ownerMembershipId: number | null;
  verifiedByMembershipId: number | null;
  createdById: string | null;
  lastEditedById: string | null;
  deletedById: string | null;
  ownerUserId: string | null;
  verifiedById: string | null;
  verifiedUntil: string | null;
  nextReviewAt: string | null;
  aclRevision: number;
  contentRevision: number;
  sourceArticleId: number | null;
};

export type KbPageListItem = Omit<KbPage, "content" | "contentText">;

export type KbPageDetail = KbPage & {
  ancestors: Array<{ id: number; title: string }>;
  isFavorite: boolean;
  canEdit?: boolean;
};

export type KbPageTreeNode = {
  id: number;
  parentPageId: number | null;
  spaceId: number | null;
  projectId: number | null;
  title: string;
  icon: string | null;
  coverImage?: string | null;
  sortOrder: number | null;
  hasChildren: boolean;
  visibility: string;
  createdById: string | null;
  status: string;
  updatedAt?: string;
};

export type KbPageSearchResult = {
  id: number;
  title: string;
  icon: string | null;
  snippet: string;
};

export type KbPageBacklink = {
  id: number;
  title: string;
  icon: string | null;
};

export type KbPageVersion = {
  id: number;
  orgId: string;
  pageId: number;
  versionNumber: number;
  title: string;
  content: Record<string, unknown>[] | Record<string, unknown> | null;
  contentText: string | null;
  changeSummary: string | null;
  authorId: string | null;
  authorMembershipId: number | null;
  authorName: string | null;
  createdAt: string;
};

export type CreateKbPageInput = {
  parentPageId?: number | null;
  spaceId?: number | null;
  title?: string;
  templateId?: number | null;
  projectId?: number | null;
};

type KbPageMetadataPatch = {
  spaceId?: number | null;
  title?: string;
  icon?: string | null;
  coverImage?: string | null;
  contentText?: string;
  changeSummary?: string;
  status?: "draft" | "in_review" | "published" | "archived";
  contentType?: string;
  ownerUserId?: string | null;
};

/**
 * Writing `content` requires the revision it is replacing — the backend refuses a body without
 * one — so an unguarded body write cannot be expressed. Metadata is not gated on someone
 * else's typing, because `contentRevision` tracks the body alone.
 */
export type UpdateKbPageInput = KbPageMetadataPatch &
  (
    | { content: unknown; expectedContentRevision: number }
    | { content?: undefined; expectedContentRevision?: number }
  );

export type MoveKbPageInput = {
  parentPageId: number | null;
  index: number;
};

export interface KbPageSearchPage {
  items: KbPageSearchResult[];
  hasMore: boolean;
  limit: number;
}
