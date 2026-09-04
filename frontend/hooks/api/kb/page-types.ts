/**
 * The KB page wire contract: the shapes `/kb/pages/*` returns and the bodies it
 * accepts.
 *
 * They are read by twenty-odd wiki components that never call a hook — a tree
 * item, a breadcrumb, a history row — so keeping them beside the twenty-three
 * TanStack hooks in `pages.ts` made every one of those components import a
 * module that pulls in the query client. The contract is also the half that has
 * to be checked against the backend Zod schema; the hooks are the half that
 * changes when caching does.
 */

export type KbPage = {
  id: number;
  orgId: string;
  spaceId: number | null;
  parentPageId: number | null;
  title: string;
  icon: string | null;
  coverImage: string | null;
  content: Record<string, unknown> | Record<string, unknown>[] | null;
  contentText: string | null;
  contentRevision: number;
  sortOrder: number;
  isLocked: boolean;
  createdById: string | null;
  lastEditedById: string | null;
  deletedAt: string | null;
  deletedById: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KbPageListItem = Omit<KbPage, "content" | "contentText">;

export type KbPageDetail = KbPage & {
  ancestors: Array<{ id: number; title: string }>;
  isFavorite: boolean;
  visibility: "private" | "org" | "public";
  publicToken: string | null;
  status: "draft" | "in_review" | "published" | "archived";
  contentType: string;
  trustState: "unverified" | "verified" | "verification_expired";
  ownerUserId: string | null;
  verifiedById: string | null;
  verifiedUntil: string | null;
  nextReviewAt: string | null;
  publicSlug: string | null;
};

export type KbPageTreeNode = {
  id: number;
  parentPageId: number | null;
  spaceId: number | null;
  title: string;
  icon: string | null;
  sortOrder: number;
  hasChildren: boolean;
  visibility: "private" | "org" | "public";
  createdById: string | null;
  status: string;
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
  content: Record<string, unknown> | Record<string, unknown>[] | null;
  contentText: string | null;
  changeSummary: string | null;
  authorId: string | null;
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

export type UpdateKbPageInput = {
  spaceId?: number | null;
  title?: string;
  icon?: string | null;
  coverImage?: string | null;
  content?: unknown;
  contentText?: string;
  changeSummary?: string;
  status?: "draft" | "in_review" | "published" | "archived";
  contentType?: string;
  ownerUserId?: string | null;
  expectedContentRevision?: number;
};

export type MoveKbPageInput = {
  parentPageId: number | null;
  index: number;
};


/**
 * `/kb/pages/search` is a bounded top-N, not a page: paging a `ts_rank` ordering means
 * re-ranking on every page, and a quick switcher that pages is a worse answer than one
 * that tells you to type more. It used to return a bare array behind an undeclared
 * `.limit(20)`, so a query matching 500 pages was indistinguishable from one matching 20;
 * `hasMore` is what makes the cut visible to the caller.
 */
export interface KbPageSearchPage {
  items: KbPageSearchResult[];
  hasMore: boolean;
  limit: number;
}
