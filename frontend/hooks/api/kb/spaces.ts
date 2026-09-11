"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import type { KbSpace, CreateSpaceInput, UpdateSpaceInput } from "@/types/kb";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const kbSpaceListContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-spaces-settings-schema").then((m) => m.kbSpaceListContract),
);

const kbSpaceFullContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-spaces-settings-schema").then((m) => m.kbSpaceFullContract),
);

const kbSpaceSuccessContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-spaces-settings-schema").then((m) => m.kbSpaceSuccessContract),
);

export function useKbSpaces() {
  const canView = useCan("kb:spaces:view");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.spaces(),
    queryFn: ({ signal }) => apiClient.get<KbSpace[]>("/kb/spaces", undefined, signal, kbSpaceListContract),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useKbSpace(spaceId: number) {
  const canView = useCan("kb:spaces:view");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.space(spaceId),
    queryFn: ({ signal }) => apiClient.get<KbSpace>(`/kb/spaces/${spaceId}`, undefined, signal, kbSpaceFullContract),
    enabled: canView && Number.isFinite(spaceId) && spaceId > 0,
    staleTime: 60_000,
  });
}

export function useCreateKbSpace() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:spaces:manage", {
    mutationKey: ["kb", "spaces", "create"],
    mutationFn: (input: CreateSpaceInput) =>
      apiClient.post<KbSpace>("/kb/spaces", input, undefined, kbSpaceFullContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.spaces() });
    },
  });
}

export function useUpdateKbSpace() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:spaces:manage", {
    mutationKey: ["kb", "spaces", "update"],
    mutationFn: ({ spaceId, ...data }: UpdateSpaceInput) =>
      apiClient.patch<KbSpace>(`/kb/spaces/${spaceId}`, data, undefined, kbSpaceFullContract),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.spaces() });
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.space(variables.spaceId) });
    },
  });
}

export function useDeleteKbSpace() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:spaces:manage", {
    mutationKey: ["kb", "spaces", "delete"],
    mutationFn: (spaceId: number) =>
      apiClient.delete<{ success: boolean }>(`/kb/spaces/${spaceId}`, undefined, undefined, kbSpaceSuccessContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.spaces() });
    },
  });
}
