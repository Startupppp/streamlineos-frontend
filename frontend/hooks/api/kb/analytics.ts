"use client";

import { useMutation, useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import type {
  KbAnalyticsOverview,
  KbAnalyticsRange,
  KbNoResultRow,
  KbPageAnalyticsRow,
  KbGapRow,
  KbGapRelatedPageRow,
  KbContentGapRow,
  KbCitationReuseRow,
  KbReviewSla,
} from "@/types/kb";

const kbAnalyticsOverviewContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-analytics-schema").then((m) => m.kbAnalyticsOverviewContract),
);

const kbAnalyticsNoResultsContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-analytics-schema").then((m) => m.kbAnalyticsNoResultsContract),
);

const kbAnalyticsPagesContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-analytics-schema").then((m) => m.kbAnalyticsPagesContract),
);

const kbAnalyticsGapsContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-analytics-schema").then((m) => m.kbAnalyticsGapsContract),
);

const kbAnalyticsContentGapsContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-analytics-schema").then((m) => m.kbAnalyticsContentGapsContract),
);

const kbAnalyticsCitationReuseContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-analytics-schema").then((m) => m.kbAnalyticsCitationReuseContract),
);

const kbAnalyticsReviewSlaContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-analytics-schema").then((m) => m.kbAnalyticsReviewSlaContract),
);

const kbAnalyticsGapRelatedPagesContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-analytics-schema").then((m) => m.kbAnalyticsGapRelatedPagesContract),
);

export function useKbAnalyticsOverview(range?: KbAnalyticsRange) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const queryParams: Record<string, unknown> = { ...range };
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.analyticsOverview(queryParams),
    queryFn: ({ signal }) => apiClient.get<KbAnalyticsOverview>("/kb/analytics/overview", queryParams, signal, kbAnalyticsOverviewContract),
    staleTime: 5 * 60_000,
    enabled: canViewAnalytics,
  });
}

export function useKbNoResults(range?: KbAnalyticsRange) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const queryParams: Record<string, unknown> = { from: range?.from, to: range?.to };
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.noResults(queryParams),
    queryFn: ({ signal }) => apiClient.get<KbNoResultRow[]>("/kb/analytics/no-results", queryParams, signal, kbAnalyticsNoResultsContract),
    staleTime: 5 * 60_000,
    enabled: canViewAnalytics,
  });
}

export interface PageAnalyticsPage {
  data: KbPageAnalyticsRow[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export interface PageAnalyticsFilters {
  spaceId?: number;
  staleOnly?: boolean;
}

export function usePageAnalytics(filters?: PageAnalyticsFilters) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const { spaceId, staleOnly } = filters ?? {};
  const keyParams: Record<string, unknown> = {
    ...(spaceId !== undefined ? { spaceId } : {}),
    ...(staleOnly === true ? { staleOnly: true } : {}),
  };
  const query = useInfiniteQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.pageAnalytics(
      Object.keys(keyParams).length > 0 ? keyParams : undefined,
    ),
    initialPageParam: NO_CURSOR_YET,
    queryFn: ({ signal, pageParam }) => {
      const params: Record<string, unknown> = {
        ...(pageParam !== undefined ? { cursor: pageParam } : {}),
        ...(spaceId !== undefined ? { spaceId } : {}),
        ...(staleOnly === true ? { staleOnly: "1" } : {}),
      };
      return apiClient.get<PageAnalyticsPage>(
        "/kb/analytics/pages",
        Object.keys(params).length > 0 ? params : undefined,
        signal,
        kbAnalyticsPagesContract,
      );
    },
    getNextPageParam: (last) => last.pagination.nextCursor ?? undefined,
    staleTime: 60_000,
    enabled: canViewAnalytics,
  });

  return {
    ...query,
    data: query.data?.pages.flatMap((page) => page.data),
  };
}

export function useCitationReuse(range?: KbAnalyticsRange) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const queryParams: Record<string, unknown> = { from: range?.from, to: range?.to };
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.citationReuse(queryParams),
    queryFn: ({ signal }) =>
      apiClient.get<KbCitationReuseRow[]>("/kb/analytics/citation-reuse", queryParams, signal, kbAnalyticsCitationReuseContract),
    staleTime: 5 * 60_000,
    enabled: canViewAnalytics,
  });
}

export function useReviewSla(range?: KbAnalyticsRange) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const queryParams: Record<string, unknown> = { from: range?.from, to: range?.to };
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.reviewSla(queryParams),
    queryFn: ({ signal }) =>
      apiClient.get<KbReviewSla>("/kb/analytics/review-sla", queryParams, signal, kbAnalyticsReviewSlaContract),
    staleTime: 5 * 60_000,
    enabled: canViewAnalytics,
  });
}

export interface GapsPage {
  data: KbGapRow[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export function useKnowledgeGaps(range?: KbAnalyticsRange) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const { from, to } = range ?? {};
  const keyParams: Record<string, unknown> = {
    ...(from !== undefined ? { from } : {}),
    ...(to !== undefined ? { to } : {}),
  };
  const query = useInfiniteQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.knowledgeGaps(
      Object.keys(keyParams).length > 0 ? keyParams : undefined,
    ),
    initialPageParam: NO_CURSOR_YET,
    queryFn: ({ signal, pageParam }) => {
      const params: Record<string, unknown> = {
        ...(pageParam !== undefined ? { cursor: pageParam } : {}),
        ...(from !== undefined ? { from } : {}),
        ...(to !== undefined ? { to } : {}),
      };
      return apiClient.get<GapsPage>(
        "/kb/analytics/gaps",
        Object.keys(params).length > 0 ? params : undefined,
        signal,
        kbAnalyticsGapsContract,
      );
    },
    getNextPageParam: (last) => last.pagination.nextCursor ?? undefined,
    staleTime: 60_000,
    enabled: canViewAnalytics,
  });

  return {
    ...query,
    gaps: query.data?.pages.flatMap((page) => page.data),
  };
}

export interface GapRelatedPagesPage {
  data: KbGapRelatedPageRow[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export function useGapRelatedPages(searchQuery: string | undefined) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const query = useInfiniteQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.gapRelatedPages(searchQuery),
    initialPageParam: NO_CURSOR_YET,
    queryFn: ({ signal, pageParam }) => {
      const params: Record<string, unknown> = {
        query: searchQuery,
        ...(pageParam !== undefined ? { cursor: pageParam } : {}),
      };
      return apiClient.get<GapRelatedPagesPage>(
        "/kb/analytics/gaps/related-pages",
        params,
        signal,
        kbAnalyticsGapRelatedPagesContract,
      );
    },
    getNextPageParam: (last) => last.pagination.nextCursor ?? undefined,
    staleTime: 30_000,
    enabled: canViewAnalytics && typeof searchQuery === "string" && searchQuery.length > 0,
  });

  return {
    ...query,
    pages: query.data?.pages.flatMap((page) => page.data),
  };
}

const kbAnalyticsGapActionContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-analytics-schema").then((m) => m.kbAnalyticsGapActionContract),
);

export function useAssignGap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["knowledge", "kb", "gaps", "assign"],
    mutationFn: (body: { query: string; assigneeUserId: string }) =>
      apiClient.post("/kb/analytics/gaps/assign", body, undefined, kbAnalyticsGapActionContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.knowledgeGaps(),
      });
    },
  });
}

export function useDismissGap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["knowledge", "kb", "gaps", "dismiss"],
    mutationFn: (body: { query: string; reason: string }) =>
      apiClient.post("/kb/analytics/gaps/dismiss", body, undefined, kbAnalyticsGapActionContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.knowledgeGaps(),
      });
    },
  });
}

export function useCreateGapFix() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["knowledge", "kb", "gaps", "create-fix"],
    mutationFn: (body: { query: string; spaceId?: number }) =>
      apiClient.post("/kb/analytics/gaps/create-fix", body, undefined, kbAnalyticsGapActionContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.knowledgeGaps(),
      });
    },
  });
}

export function useKbContentGaps(range?: KbAnalyticsRange) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const queryParams: Record<string, unknown> = { from: range?.from, to: range?.to };
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.contentGaps(queryParams),
    queryFn: ({ signal }) => apiClient.get<KbContentGapRow[]>("/kb/analytics/content-gaps", queryParams, signal, kbAnalyticsContentGapsContract),
    staleTime: 60_000,
    enabled: canViewAnalytics,
  });
}
