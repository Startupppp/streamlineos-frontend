import type { KbWorkbookCell } from "./kb-pages-schema";

export type KbPageKind = "document" | "spreadsheet" | "file";

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
  kind: KbPageKind;
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
  legalHold: boolean;
  legalHoldReason: string | null;
};

export type KbPageListItem = Omit<KbPage, "content" | "contentText">;

export type KbPageCapabilities = {
  view: boolean;
  comment: boolean;
  edit: boolean;
  manage: boolean;
  restore: boolean;
};

export type KbAccessRoute =
  | "owner"
  | "admin"
  | "creator"
  | "organization"
  | "public"
  | "space"
  | "project"
  | "grant";

export type KbPageDetail = KbPage & {
  ancestors: Array<{ id: number; title: string }>;
  isFavorite: boolean;
  canEdit?: boolean;
  can: KbPageCapabilities;
  access: { via: KbAccessRoute; grantExpiresAt: string | null };
};

export type KbPageTreeNode = {
  id: number;
  contentRevision: number;
  parentPageId: number | null;
  spaceId: number | null;
  projectId: number | null;
  title: string;
  kind: KbPageKind;
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

export type KbWorkbookSheetInput = {
  id?: string;
  name: string;
  position: number;
  config: Record<string, unknown>;
  cells: KbWorkbookCell[];
};

export type KbWorkbookInput = { sheets: KbWorkbookSheetInput[] };

export type KbWorkbookOp =
  | { op: "addSheet"; sheetId: string; name: string; position: number }
  | { op: "renameSheet"; sheetId: string; name: string }
  | { op: "moveSheet"; sheetId: string; position: number }
  | { op: "deleteSheet"; sheetId: string }
  | { op: "setSheetConfig"; sheetId: string; config: Record<string, unknown> }
  | { op: "setCells"; sheetId: string; cells: KbWorkbookCell[] }
  | { op: "clearCells"; sheetId: string; cells: Array<{ r: number; c: number }> };

export type CreateKbPageInput = {
  parentPageId?: number | null;
  spaceId?: number | null;
  title?: string;
  templateId?: number | null;
  projectId?: number | null;
  kind?: KbPageKind;
  workbook?: KbWorkbookInput;
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

type KbPageRevisionedPatch = KbPageMetadataPatch & {
  content?: unknown;
  expectedContentRevision: number;
};

type KbPageNonIndexedPatch = Omit<
  KbPageMetadataPatch,
  "contentText" | "title" | "contentType" | "status"
> & {
  content?: never;
  contentText?: never;
  title?: never;
  contentType?: never;
  status?: never;
  expectedContentRevision?: number;
};

export type UpdateKbPageInput = KbPageRevisionedPatch | KbPageNonIndexedPatch;

export type MoveKbPageInput = {
  parentPageId: number | null;
  spaceId?: number | null;
  index: number;
};

export interface KbPageSearchPage {
  items: KbPageSearchResult[];
  hasMore: boolean;
  limit: number;
}
