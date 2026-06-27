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

export interface KbArticleVersion {
  id: number;
  versionNumber: number;
  title: string;
  excerpt: string | null;
  changeSummary: string | null;
  authorId: string | null;
  createdAt: string;
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
  slug?: string;
  description?: string | null;
  audience?: KbAudience;
  icon?: string | null;
  isPublicHelpCenter?: boolean;
}

export interface UpdateSpaceInput {
  id: number;
  name?: string;
  slug?: string;
  description?: string | null;
  audience?: KbAudience;
  icon?: string | null;
  isPublicHelpCenter?: boolean;
}

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  description?: string | null;
  icon?: string | null;
  sortOrder?: number;
  parentId?: number | null;
}

export interface UpdateCategoryInput {
  id: number;
  spaceId: number;
  name?: string;
  slug?: string;
  description?: string | null;
  icon?: string | null;
  sortOrder?: number;
  parentId?: number | null;
}

export interface CreateArticleInput {
  title: string;
  spaceId?: number | null;
  categoryId?: number | null;
  slug?: string;
  excerpt?: string | null;
  content?: string;
  contentText?: string;
  status?: KbArticleStatus;
  visibility?: KbVisibility;
  tags?: string[] | null;
  ownerId?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  reviewIntervalDays?: number | null;
}

export interface UpdateArticleInput {
  id: number;
  title?: string;
  spaceId?: number | null;
  categoryId?: number | null;
  slug?: string;
  excerpt?: string | null;
  content?: string;
  contentText?: string;
  status?: KbArticleStatus;
  visibility?: KbVisibility;
  tags?: string[] | null;
  ownerId?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  reviewIntervalDays?: number | null;
}

export interface VerifyArticleInput {
  id: number;
  note?: string;
  reviewIntervalDays?: number | null;
}

export interface VoteArticleInput {
  id: number;
  helpful: boolean;
}

export interface ListArticlesParams {
  spaceId?: number;
  categoryId?: number;
  status?: KbArticleStatus;
  visibility?: KbVisibility;
  search?: string;
  tags?: string[];
  ownerId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "title" | "updatedAt" | "helpfulCount" | "status";
  sortOrder?: "asc" | "desc";
}

export interface KbSearchResult {
  id: number;
  spaceId: number | null;
  categoryId: number | null;
  title: string;
  slug: string;
  excerpt: string | null;
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

export interface KbAskCitation {
  articleId: number;
  title: string;
  slug: string;
  spaceId: number | null;
}

export interface KbAskResponse {
  answer: string;
  citations: KbAskCitation[];
  hasContext: boolean;
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
