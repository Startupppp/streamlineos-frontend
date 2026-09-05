"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type KbPageRecordLink = {
  id: number;
  targetType: string;
  targetId: string | null;
  label: string | null;
};

export type CreateKbPageRecordLinkInput = {
  targetType: string;
  targetId: string;
  label: string;
};

export function useKbPageRecordLinks(pageId: number) {
  const canViewPages = useCan("kb:pages:view");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.pageRecordLinks(pageId),
    queryFn: ({ signal }) => apiClient.get<KbPageRecordLink[]>(`/kb/pages/${pageId}/record-links`, undefined, signal),
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
      }),
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
      apiClient.delete(`/kb/record-links/${params.linkId}`),
    onSuccess: (_, params) => {
      void qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.pageRecordLinks(params.pageId) });
    },
  });
}
