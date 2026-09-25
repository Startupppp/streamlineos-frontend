"use client";

import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import type { KbPage, KbPageVersion } from "./page-types";

type CursorPage<T> = {
  data: T[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

const kbPageVersionListContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-pages-schema").then((m) => m.kbPageVersionListContract),
);

const kbPageVersionContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-pages-schema").then((m) => m.kbPageVersionContract),
);

const kbPageContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-pages-schema").then((m) => m.kbPageContract),
);

export function useKbPageVersionsInfinite(pageId: number) {
  const canView = useCan("kb:pages:view");
  return useInfiniteQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.pageVersions(pageId),
    queryFn: ({ pageParam, signal }) => {
      const params: Record<string, unknown> = {};
      if (pageParam !== undefined) params.cursor = pageParam;
      return apiClient.get<CursorPage<KbPageVersion>>(
        `/kb/pages/${pageId}/versions`,
        params,
        signal,
        kbPageVersionListContract,
      );
    },
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 60_000,
    enabled: canView && Number.isFinite(pageId) && pageId > 0,
  });
}

export function useKbPageVersionDetail(pageId: number, versionNumber: number) {
  const canView = useCan("kb:pages:view");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.pageVersion(pageId, versionNumber),
    queryFn: ({ signal }) =>
      apiClient.get<KbPageVersion>(
        `/kb/pages/${pageId}/versions/${versionNumber}`,
        undefined,
        signal,
        kbPageVersionContract,
      ),
    staleTime: 300_000,
    enabled:
      canView &&
      Number.isFinite(pageId) &&
      pageId > 0 &&
      Number.isFinite(versionNumber) &&
      versionNumber > 0,
  });
}

export function useRestoreKbVersion() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pages", "versions", "restore"],
    mutationFn: ({ pageId, versionNumber }: { pageId: number; versionNumber: number }) =>
      apiClient.post<KbPage>(
        `/kb/pages/${pageId}/versions/${versionNumber}/restore`,
        undefined,
        undefined,
        kbPageContract,
      ),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.page(variables.pageId),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pageVersions(variables.pageId),
      });
    },
  });
}
