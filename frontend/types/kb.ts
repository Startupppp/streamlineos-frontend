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

export interface KbCategory {
  id: number;
  spaceId: number | null;
  parentId: number | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
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

export interface PaginatedArticles {
  items: KbArticleListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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

export interface CreateCategoryInput {
  name: string;
  description?: string | null;
  icon?: string | null;
  sortOrder?: number;
  parentId?: number | null;
}

export interface CreateArticleInput {
  title: string;
  spaceId: number;
  categoryId?: number | null;
  excerpt?: string | null;
  content?: string;
  contentText?: string;
  status?: KbArticleStatus;
  visibility?: KbVisibility;
  tags?: string[] | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  reviewIntervalDays?: number | null;
}

export interface UpdateArticleInput {
  articleId: number;
  title?: string;
  spaceId?: number | null;
  categoryId?: number | null;
  excerpt?: string | null;
  content?: string;
  contentText?: string;
  status?: KbArticleStatus;
  visibility?: KbVisibility;
  tags?: string[] | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  reviewIntervalDays?: number | null;
}

export interface VerifyArticleInput {
  articleId: number;
  reviewIntervalDays?: number | null;
}

export interface VoteArticleInput {
  articleId: number;
  helpful: boolean;
  comment?: string;
}

export interface ListArticlesParams {
  spaceId?: number;
  categoryId?: number;
  status?: KbArticleStatus;
  search?: string;
  page?: number;
  pageSize?: number;
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
    }
  | {
      kind: "page";
      pageId: number;
      title: string;
      spaceId: number | null;
    }
  | {
      kind: "source";
      sourceId: number;
      title: string;
      spaceId: number | null;
    };

export interface KbAskResponse {
  answer: string;
  citations: KbAskCitation[];
  hasContext: boolean;
  conversationId: number;
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
  views: number;
  verifiedPublished: number;
  trustScore: number;
  topArticles: KbAnalyticsTopArticle[];
}

export interface KbNoResultRow {
  query: string | null;
  count: number;
}

export interface KbVerificationItem {
  id: number;
  title: string;
  slug: string;
  spaceId: number | null;
  ownerId: string | null;
  lastVerifiedAt: string | null;
  reviewIntervalDays: number | null;
}

export interface KbAnalyticsRange {
  from?: string;
  to?: string;
}

export type KbSpaceRole = "viewer" | "commenter" | "editor" | "publisher" | "admin";

export interface KbSpaceMember {
  id: number;
  spaceId: number;
  userId: string | null;
  role: string | null;
  team: string | null;
  spaceRole: KbSpaceRole;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
}

export type KbSpaceMemberRow = Omit<KbSpaceMember, "userName" | "userEmail" | "userImage">;

export interface AddKbSpaceMemberInput {
  userId?: string;
  role?: string;
  spaceRole: KbSpaceRole;
}

export interface KbAiDraftInput {
  prompt: string;
  title?: string;
}

export interface KbAiImproveInput {
  text: string;
  instruction?: string;
}

export interface KbAiSummarizeInput {
  text: string;
}

export interface KbAiContent {
  content: string;
}

export interface KbArticleVersion {
  id: number;
  articleId: number;
  versionNumber: number;
  title: string;
  content: string;
  excerpt: string | null;
  changeSummary: string | null;
  authorId: string | null;
  createdAt: string;
}

export interface KbTag {
  id: number;
  orgId: string;
  name: string;
  slug: string;
  createdAt: string;
}

export type KbTranslationStatus = "draft" | "in_progress" | "translated" | "published" | "outdated";

export interface KbTranslation {
  id: number;
  articleId: number;
  locale: string;
  title: string;
  content: string;
  contentText: string;
  excerpt: string | null;
  status: KbTranslationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertTranslationInput {
  articleId: number;
  locale: string;
  title: string;
  content?: string;
  contentText?: string;
  excerpt?: string | null;
  status?: KbTranslationStatus;
}

export interface KbComment {
  id: number;
  articleId: number;
  authorId: string | null;
  parentId: number | null;
  content: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
