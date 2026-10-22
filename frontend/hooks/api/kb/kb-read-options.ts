import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";

const kb = knowledgeAndSurveysQueryKeys.kb;

export const kbPagesRecentQueryOptions = {
  queryKey: kb.pagesRecent(),
  staleTime: 30_000,
} as const;

export const kbPagesFavoritesQueryOptions = {
  queryKey: kb.pagesFavorites(),
  staleTime: 30_000,
} as const;

export function kbSpacesListQueryOptions(params?: Record<string, unknown>) {
  return { queryKey: kb.spacesList(params), staleTime: 60_000 } as const;
}

export function kbAnalyticsOverviewQueryOptions(params?: Record<string, unknown>) {
  return { queryKey: kb.analyticsOverview(params), staleTime: 5 * 60_000 } as const;
}

export const kbHrLinkConfigQueryOptions = {
  queryKey: kb.hrLinkConfig(),
  staleTime: 60_000,
} as const;

export function kbLinkedDocumentsQueryOptions(params?: Record<string, unknown>) {
  return { queryKey: kb.linkedDocuments(params), staleTime: 30_000 } as const;
}

export function kbLinkedDocumentQueryOptions(id: number) {
  return { queryKey: kb.linkedDocument(id), staleTime: 60_000 } as const;
}

export function kbPageCollectionQueryOptions(params?: Record<string, unknown>) {
  return { queryKey: kb.pageCollection(params), staleTime: 30_000 } as const;
}

export function kbPagesTrashQueryOptions(params?: Record<string, unknown>) {
  return { queryKey: kb.pagesTrash(params), staleTime: 30_000 } as const;
}

export const kbContentHealthCountsQueryOptions = {
  queryKey: kb.contentHealthCounts(),
  staleTime: 2 * 60_000,
} as const;

export function kbPageReviewsQueryOptions(params?: Record<string, unknown>) {
  return { queryKey: kb.pageReviews(params), staleTime: 30_000 } as const;
}

export function kbPageTemplatesQueryOptions(q?: string) {
  return { queryKey: kb.pageTemplates(q), staleTime: 300_000 } as const;
}

export const kbResearchBriefsQueryOptions = {
  queryKey: kb.researchBriefs(),
  staleTime: 30_000,
} as const;

export function kbResearchBriefQueryOptions(briefId: number) {
  return { queryKey: kb.researchBrief(briefId), staleTime: 10_000 } as const;
}

export const kbConversationsQueryOptions = {
  queryKey: kb.chatConversations(),
  staleTime: 30_000,
} as const;

export function kbPageQueryOptions(pageId: number) {
  return { queryKey: kb.page(pageId), staleTime: 15_000 } as const;
}

export function kbPageVersionsQueryOptions(pageId: number) {
  return { queryKey: kb.pageVersions(pageId), staleTime: 60_000 } as const;
}

export function kbSpaceQueryOptions(spaceId: number) {
  return { queryKey: kb.space(spaceId), staleTime: 60_000 } as const;
}

export const kbSharingSettingsQueryOptions = {
  queryKey: kb.sharingSettings(),
  staleTime: 300_000,
} as const;
