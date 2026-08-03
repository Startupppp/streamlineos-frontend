import type { AiUsageMeta } from "@/components/ai/ai-usage-chip";

export type KbAudience = "internal" | "public" | "mixed";

export type KbArticleStatus = "draft" | "in_review" | "published" | "archived";

export type KbVisibility = "public" | "internal";

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
}

export interface KbArticleListItem {
  id: number;
  spaceId: number | null;
  categoryId: number | null;
  title: string;
  slug: string;
  excerpt: string | null;
  status: KbArticleStatus;
  visibility: KbVisibility;
  tags: string[] | null;
  ownerId: string | null;
  helpfulCount: number;
  notHelpfulCount: number;
  lastVerifiedAt: string | null;
  updatedAt: string;
}

export interface KbArticle extends KbArticleListItem {
  content: string;
  contentText: string;
  seoTitle: string | null;
  seoDescription: string | null;
  reviewIntervalDays: number | null;
  publishedAt: string | null;
  authorId: string | null;
  category?: { id: number; name: string; slug: string } | null;
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

export interface KbSearchResult {
  id: number;
  spaceId: number | null;
  categoryId: number | null;
  title: string;
  slug: string;
  excerpt: string | null;
  snippet?: string;
  status: KbArticleStatus;
  updatedAt: string;
}

export interface KbSearchResponse {
  items: KbSearchResult[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type KbAskCitation =
  | {
      kind: "article";
      articleId: number;
      title: string;
      slug: string;
      spaceId: number | null;
      updatedAt: string;
    }
  | {
      kind: "page";
      pageId: number;
      title: string;
      spaceId: number | null;
      updatedAt: string;
    }
  | {
      kind: "source";
      sourceId: number;
      title: string;
      spaceId: number | null;
      updatedAt: string;
    };

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

export interface KbAnalyticsTopArticle {
  id: number;
  title: string;
  slug: string;
  spaceId: number | null;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
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
  verifiedPublished: number;
  trustScore: number;
  topArticles: KbAnalyticsTopArticle[];
}

export interface KbNoResultRow {
  query: string | null;
  count: number;
}

export interface KbAnalyticsRange {
  from?: string;
  to?: string;
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

export type KbResearchBriefListItem = Omit<KbResearchBrief, "report">;

export interface CreateResearchBriefInput {
  topic: string;
  spaceId?: number;
}

export interface KbAiFeedbackInput {
  rating: "helpful" | "not_helpful" | "missing_source";
  question: string;
  comment?: string;
}
