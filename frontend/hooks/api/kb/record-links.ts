"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import { selectFlatPages, type Page } from "@/lib/api/select-flat-pages";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

export type KbPageRecordLink = {
  id: number;
  targetType: string;
  targetId: string | null;
  label: string | null;
};

export type KbPageRecordLinkPage = Page<KbPageRecordLink>;

export type CreateKbPageRecordLinkInput = {
  targetType: string;
  targetId: string;
  label: string;
};

const kbRecordLinkListContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-record-links-schema").then((m) => m.kbRecordLinkListContract),
);

const kbRecordLinkSingleContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-record-links-schema").then((m) => m.kbRecordLinkSingleContract),
);

const kbRecordLinkSuccessContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-record-links-schema").then((m) => m.kbRecordLinkSuccessContract),
);

export function useKbPageRecordLinks(pageId: number) {
  const canViewPages = useCan("kb:pages:view");
  return useInfiniteQuery({
    ...INLINE_READ_ERROR,
    queryKey: knowledgeAndSurveysQueryKeys.kb.pageRecordLinks(pageId),
    initialPageParam: NO_CURSOR_YET,
    queryFn: ({ signal, pageParam }) => apiClient.get<KbPageRecordLinkPage>(
      `/kb/pages/${pageId}/record-links`,
      pageParam !== undefined ? { cursor: pageParam } : undefined,
      signal,
      kbRecordLinkListContract,
    ),
    getNextPageParam: (last) => last.pagination.nextCursor ?? undefined,
    select: selectFlatPages,
    enabled: canViewPages,
    staleTime: 30_000,
  });
}

export function useAddKbPageRecordLink() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "record-links", "add"],
    mutationFn: (params: { pageId: number } & CreateKbPageRecordLinkInput) =>
      apiClient.post<KbPageRecordLink>(`/kb/pages/${params.pageId}/record-links`, {
        targetType: params.targetType,
        targetId: params.targetId,
        label: params.label,
      }, undefined, kbRecordLinkSingleContract),
    onSuccess: (_, params) => {
      void qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.pageRecordLinks(params.pageId) });
    },
  });
}

export function useRemoveKbPageRecordLink() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "record-links", "remove"],
    mutationFn: (params: { linkId: number; pageId: number }) =>
      apiClient.delete(`/kb/record-links/${params.linkId}`, undefined, undefined, kbRecordLinkSuccessContract),
    onSuccess: (_, params) => {
      void qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.pageRecordLinks(params.pageId) });
    },
  });
}
