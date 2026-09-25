import type { AiUsageMeta } from "@/components/ai/ai-usage-chip";

export type KbAudience = "internal" | "public" | "mixed";

export type KbSpaceRole = "admin" | "manager" | "editor" | "viewer";

export const KB_ACCESS_LABELS: Record<KbSpaceRole, string> = {
  admin: "Admin",
  manager: "Manager",
  editor: "Editor",
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
  pagesOverdueForReview?: number;
  pagesWithReviewPolicy?: number;
  viewerSpaceRole?: KbSpaceRole | null;
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
  page?: number;
  pageSize?: number;
}

export interface KbAskInput {
  question: string;
  spaceId?: number;
  conversationId?: number;
}

export interface KbAnalyticsOverview {
  totalCount: number;
  publishedCount: number;
  archivedCount: number;
  totalViews: number;
  helpfulUp: number;
  helpfulDown: number;
  helpfulRatio: number;
  searches: number;
  noResults: number;
  searchSuccessRate: number;
  aiAnswers: number;
  aiNoContext: number;
  views: number;
  ticketsDeflected: number;
  verifiedPublished: number;
  trustScore: number;
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
  createdAt: string;
  updatedAt: string;
}

export type KbResearchBriefListItem = Omit<KbResearchBrief, "report" | "citations">;

export interface KbResearchBriefListPage {
  items: KbResearchBriefListItem[];
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
