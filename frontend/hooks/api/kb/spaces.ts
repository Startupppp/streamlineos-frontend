"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import type { KbSpace, CreateSpaceInput, UpdateSpaceInput } from "@/types/kb";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  KbSpaceListPage,
  KbSpaceArchiveImpact,
} from "@/hooks/api/kb/kb-spaces-settings-schema";

export type { KbSpaceListItem } from "@/hooks/api/kb/kb-spaces-settings-schema";
export type { KbSpaceListPage } from "@/hooks/api/kb/kb-spaces-settings-schema";
export type { KbSpaceArchiveImpact } from "@/hooks/api/kb/kb-spaces-settings-schema";
export type { KbSpaceMember } from "@/hooks/api/kb/kb-spaces-settings-schema";

export interface KbSpacesListParams {
  q?: string;
  audience?: "internal" | "public" | "mixed";
  archived?: boolean;
  cursor?: string;
  limit?: number;
}

const kbSpaceListPageContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-spaces-settings-schema").then((m) => m.kbSpaceListPageContract),
);

const kbSpaceFullContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-spaces-settings-schema").then((m) => m.kbSpaceFullContract),
);

const kbSpaceSuccessContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-spaces-settings-schema").then((m) => m.kbSpaceSuccessContract),
);

const kbSpaceArchiveImpactContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-spaces-settings-schema").then((m) => m.kbSpaceArchiveImpactContract),
);

const kbSpaceMemberListContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-spaces-settings-schema").then((m) => m.kbSpaceMemberListContract),
);

export function useKbSpaces(params?: KbSpacesListParams) {
  const canView = useCan("kb:spaces:view");
  const queryParams: Record<string, unknown> = {};
  if (params?.q) queryParams.q = params.q;
  if (params?.audience) queryParams.audience = params.audience;
  if (params?.archived !== undefined) queryParams.archived = params.archived ? "1" : "0";
  if (params?.cursor) queryParams.cursor = params.cursor;
  if (params?.limit !== undefined) queryParams.limit = params.limit;

  return useQuery({
    queryKey: [...knowledgeAndSurveysQueryKeys.kb.spaces(), params],
    queryFn: ({ signal }) =>
      apiClient.get<KbSpaceListPage>("/kb/spaces", queryParams, signal, kbSpaceListPageContract),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useKbSpace(spaceId: number) {
  const canView = useCan("kb:spaces:view");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.space(spaceId),
    queryFn: ({ signal }) =>
      apiClient.get<KbSpace>(`/kb/spaces/${spaceId}`, undefined, signal, kbSpaceFullContract),
    enabled: canView && Number.isFinite(spaceId) && spaceId > 0,
    staleTime: 60_000,
  });
}

export function useKbSpaceArchiveImpact(
  spaceId: number,
  options?: { enabled?: boolean },
) {
  const canManage = useCan("kb:spaces:manage");
  return useQuery({
    queryKey: [...knowledgeAndSurveysQueryKeys.kb.space(spaceId), "archive-impact"],
    queryFn: ({ signal }) =>
      apiClient.get<KbSpaceArchiveImpact>(
        `/kb/spaces/${spaceId}/archive-impact`,
        undefined,
        signal,
        kbSpaceArchiveImpactContract,
      ),
    enabled: canManage && Number.isFinite(spaceId) && spaceId > 0 && (options?.enabled ?? false),
    staleTime: 30_000,
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.spaces() });
    },
  });
}

export function useArchiveKbSpace() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:spaces:manage", {
    mutationKey: ["kb", "spaces", "archive"],
    mutationFn: (spaceId: number) =>
      apiClient.post<{ success: boolean }>(
        `/kb/spaces/${spaceId}/archive`,
        {},
        undefined,
        kbSpaceSuccessContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.spaces() });
    },
  });
}

export function useRestoreKbSpace() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:spaces:manage", {
    mutationKey: ["kb", "spaces", "restore"],
    mutationFn: (spaceId: number) =>
      apiClient.post<{ success: boolean }>(
        `/kb/spaces/${spaceId}/restore`,
        {},
        undefined,
        kbSpaceSuccessContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.spaces() });
    },
  });
}

export function useDeleteKbSpace() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:spaces:manage", {
    mutationKey: ["kb", "spaces", "delete"],
    mutationFn: (spaceId: number) =>
      apiClient.delete<{ success: boolean }>(
        `/kb/spaces/${spaceId}`,
        undefined,
        undefined,
        kbSpaceSuccessContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.spaces() });
    },
  });
}

export function useKbSpaceMembers(
  spaceId: number,
  options?: { enabled?: boolean },
) {
  const canManage = useCan("kb:spaces:manage");
  return useQuery({
    queryKey: [...knowledgeAndSurveysQueryKeys.kb.space(spaceId), "members"],
    queryFn: ({ signal }) =>
      apiClient.get(
        `/kb/spaces/${spaceId}/members`,
        undefined,
        signal,
        kbSpaceMemberListContract,
      ),
    enabled: canManage && Number.isFinite(spaceId) && spaceId > 0 && (options?.enabled ?? true),
    staleTime: 60_000,
  });
}
