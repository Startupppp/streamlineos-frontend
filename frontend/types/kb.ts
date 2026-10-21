import type { AiUsageMeta } from "@/components/ai/ai-usage-chip";

export type KbAudience = "internal" | "public" | "mixed";

export type KbSpaceRole = "admin" | "publisher" | "editor" | "commenter" | "viewer";

export const KB_ACCESS_LABELS: Record<KbSpaceRole, string> = {
  admin: "Admin",
  publisher: "Publisher",
  editor: "Editor",
  commenter: "Commenter",
  viewer: "Viewer",
};

export interface KbSpace {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  audience: KbAudience;
  icon: string | null;
  isPublicHelpCenter: boolean;
  articleCount?: number;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  ownerName?: string | null;
  pagesOverdueForReview?: number;
  pagesWithReviewPolicy?: number;
  viewerSpaceRole?: KbSpaceRole | null;
  viewerAccess?: {
    level: "view" | "comment" | "edit" | "manage";
    via: "admin" | "team_folder" | "team_folder_admin" | "organization";
  } | null;
}

export interface CreateSpaceInput {
  name: string;
  description?: string | null;
  audience?: KbAudience;
  icon?: string | null;
  isPublicHelpCenter?: boolean;
}

export interface UpdateSpaceInput {
  spaceId: number;
  name?: string;
  description?: string | null;
  audience?: KbAudience;
  icon?: string | null;
  isPublicHelpCenter?: boolean;
}

interface KbAskCitationEvidence {
  title: string;
  updatedAt: string;
  passage?: string;
  verified?: boolean;
}

export type KbAskCitation =
  | (KbAskCitationEvidence & {
      kind: "article";
      articleId: number;
      slug: string;
      spaceId: number | null;
    })
  | (KbAskCitationEvidence & {
      kind: "page";
      pageId: number;
      spaceId: number | null;
    })
  | (KbAskCitationEvidence & {
      kind: "source";
      sourceId: number;
      spaceId: number | null;
    })
  | (KbAskCitationEvidence & {
      kind: "document";
      linkedDocumentId: number;
      spaceId: null;
    });

export interface KbAskResponse {
  answer: string;
  citations: KbAskCitation[];
  hasContext: boolean;
  conversationId: number;
  aiUsage?: AiUsageMeta | null;
}

export interface KbSearchParams {
  q: string;
  spaceId?: number;
  pageSize?: number;
}

export interface KbAnalyticsOverview {
  totalCount: number | null;
  publishedCount: number | null;
  archivedCount: number | null;
  totalViews: number | null;
  helpfulUp: number | null;
  helpfulDown: number | null;
  helpfulRatio: number | null;
  searches: number | null;
  noResults: number | null;
  searchSuccessRate: number | null;
  aiAnswers: number | null;
  aiNoContext: number | null;
  searchScopeComplete: boolean;
  views: number | null;
  ticketsDeflected: number | null;
  verifiedPublished: number | null;
  trustScore: number | null;
  suppressionReasons: Record<string, "minimum_cohort" | "incomplete_scope">;
}

export interface KbNoResultRow {
  query: string | null;
  count: number;
}

export interface KbAnalyticsRange {
  from?: string;
  to?: string;
  spaceId?: number;
}

export interface KbCitationReuseRow {
  kind: string;
  refId: number;
  title: string;
  reuseCount: number;
}

export interface KbReviewSla {
  decided: number;
  metSla: number;
  slaRate: number;
  overdueOpen: number;
}

export interface KbPageAnalyticsRow {
  id: number;
  title: string;
  status: "draft" | "in_review" | "published" | "archived";
  trustState: "unverified" | "verified" | "verification_expired";
  updatedAt: string;
  uniqueViewers: number;
  commentCount: number;
  versionCount: number;
}

export interface KbGapRow {
  query: string | null;
  count: number;
  lastOccurredAt: string;
}

export interface KbGapRelatedPageRow {
  id: number;
  title: string;
  status: string;
  updatedAt: string;
}

export interface KbContentGapRow {
  query: string | null;
  count: number;
  lastOccurredAt: string;
  gapKind: "search" | "ai_no_context";
}

export type KbResearchBriefStatus = "queued" | "running" | "completed" | "failed";

export interface KbResearchBriefCitation {
  kind: string;
  id: number;
  title: string;
  href: string | null;
  updatedAt: string | null;
}

export interface KbResearchBrief {
  id: number;
  orgId: string;
  userId: string | null;
  topic: string;
  spaceId: number | null;
  status: KbResearchBriefStatus;
  jobId: number | null;
  sourceCount: number;
  report: string | null;
  citations: KbResearchBriefCitation[] | null;
  errorMessage: string | null;
  rating: "helpful" | "not_helpful" | null;
  costCredits: number | null;
  provider: string | null;
  model: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type KbResearchBriefListItem = Omit<KbResearchBrief, "report" | "citations">;

export interface KbResearchBriefListPage {
  items: KbResearchBriefListItem[];
  hasMore: boolean;
  nextCursor: number | null;
}

export interface CreateResearchBriefInput {
  topic: string;
  spaceId?: number;
}

export interface KbAiFeedbackInput {
  rating: "helpful" | "not_helpful" | "missing_source";
  question: string;
  comment?: string;
}
