"use client";

import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useKbSpaces } from "./spaces";
import type {
  CreateKbPageInput,
  KbPage,
  KbPageBacklink,
  KbPageDetail,
  KbPageListItem,
  KbPageSearchPage,
  KbPageTreeNode,
  KbPageVersion,
  MoveKbPageInput,
  UpdateKbPageInput,
} from "./page-types";

function deriveAclVersion(ids: number[]): string {
  return [...ids].sort((a, b) => a - b).join(",");
}


export function useKbPagesTree() {
  const canView = useCan("kb:pages:view");
  return useQuery({
    queryKey: queryKeys.kb.pagesTree(),
    queryFn: ({ signal }) => apiClient.get<KbPageTreeNode[]>("/kb/pages/tree", undefined, signal),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useKbProjectPagesTree(projectId: number) {
  const canView = useCan("kb:pages:view");
  return useQuery({
    queryKey: queryKeys.kb.pagesTreeByProject(projectId),
    queryFn: ({ signal }) => apiClient.get<KbPageTreeNode[]>("/kb/pages/tree", { projectId }, signal),
    staleTime: 30_000,
    enabled: canView && Number.isFinite(projectId) && projectId > 0,
  });
}

export function useKbPagesRecent() {
  const canView = useCan("kb:pages:view");
  return useQuery({
    queryKey: queryKeys.kb.pagesRecent(),
    queryFn: ({ signal }) => apiClient.get<KbPageListItem[]>("/kb/pages/recent", undefined, signal),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useKbPagesFavorites() {
  const canView = useCan("kb:pages:view");
  return useQuery({
    queryKey: queryKeys.kb.pagesFavorites(),
    queryFn: ({ signal }) => apiClient.get<KbPageListItem[]>("/kb/pages/favorites", undefined, signal),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useKbPagesTrash() {
  const canView = useCan("kb:pages:view");
  return useQuery({
    queryKey: queryKeys.kb.pagesTrash(),
    queryFn: ({ signal }) => apiClient.get<KbPage[]>("/kb/pages/trash", undefined, signal),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useKbPagesSearch(q: string) {
  const canView = useCan("kb:pages:view");
  const { data: spaces, isLoading: spacesLoading } = useKbSpaces();
  const aclVersion = spacesLoading
    ? null
    : deriveAclVersion((spaces ?? []).map((s) => s.id));
  return useQuery({
    queryKey: queryKeys.kb.pagesSearch(q, aclVersion ?? ""),
    queryFn: ({ signal }) =>
      apiClient.get<KbPageSearchPage>("/kb/pages/search", { q }, signal),
    staleTime: 0,
    enabled: canView && q.length > 0 && aclVersion !== null,
  });
}

export function useKbPage(pageId: number) {
  const canView = useCan("kb:pages:view");
  return useQuery({
    queryKey: queryKeys.kb.page(pageId),
    queryFn: ({ signal }) => apiClient.get<KbPageDetail>(`/kb/pages/${pageId}`, undefined, signal),
    staleTime: 15_000,
    enabled: canView && Number.isFinite(pageId) && pageId > 0,
  });
}

export function useKbPageBacklinks(pageId: number) {
  const canView = useCan("kb:pages:view");
  return useQuery({
    queryKey: queryKeys.kb.pageBacklinks(pageId),
    queryFn: ({ signal }) => apiClient.get<KbPageBacklink[]>(`/kb/pages/${pageId}/backlinks`, undefined, signal),
    staleTime: 60_000,
    enabled: canView && Number.isFinite(pageId) && pageId > 0,
  });
}

type CursorPage<T> = {
  data: T[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

export function useKbPageVersions(pageId: number) {
  const canView = useCan("kb:pages:view");
  return useInfiniteQuery({
    queryKey: queryKeys.kb.pageVersions(pageId),
    queryFn: ({ pageParam, signal }) => {
      const params: Record<string, unknown> = {};
      if (pageParam !== undefined) params.cursor = pageParam;
      return apiClient.get<CursorPage<KbPageVersion>>(
        `/kb/pages/${pageId}/versions`,
        params,
        signal,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 60_000,
    enabled: canView && Number.isFinite(pageId) && pageId > 0,
  });
}

export function useKbPageVersion(pageId: number, versionNumber: number) {
  const canView = useCan("kb:pages:view");
  return useQuery({
    queryKey: queryKeys.kb.pageVersion(pageId, versionNumber),
    queryFn: ({ signal }) => apiClient.get<KbPageVersion>(`/kb/pages/${pageId}/versions/${versionNumber}`, undefined, signal),
    staleTime: 300_000,
    enabled:
      canView &&
      Number.isFinite(pageId) &&
      pageId > 0 &&
      Number.isFinite(versionNumber) &&
      versionNumber > 0,
  });
}

export function useCreateKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:create", {
    mutationKey: ["kb", "pages", "create"],
    mutationFn: (input: CreateKbPageInput) => apiClient.post<KbPage>("/kb/pages", input),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTree() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesRecent() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.kbPages() });
      if (variables.projectId) {
        qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTreeByProject(variables.projectId) });
      }
    },
  });
}

export function useUpdateKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pages", "update"],
    mutationFn: ({ pageId, ...data }: UpdateKbPageInput & { pageId: number }) =>
      apiClient.patch<KbPage>(`/kb/pages/${pageId}`, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.page(variables.pageId) });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTree() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesRecent() });
    },
  });
}

export function useDeleteKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:delete", {
    mutationKey: ["kb", "pages", "delete"],
    mutationFn: (pageId: number) =>
      apiClient.delete<{ deletedCount: number }>(`/kb/pages/${pageId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTree() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTrash() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.kbPages() });
    },
  });
}

export function useRestoreKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pages", "restore"],
    mutationFn: (pageId: number) => apiClient.post<KbPage>(`/kb/pages/${pageId}/restore`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTree() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTrash() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.kbPages() });
    },
  });
}

export function useHardDeleteKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:purge", {
    mutationKey: ["kb", "pages", "hardDelete"],
    mutationFn: (pageId: number) => apiClient.delete<void>(`/kb/pages/${pageId}/permanent`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTrash() });
    },
  });
}

export function useEmptyKbTrash() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:purge", {
    mutationKey: ["kb", "pages", "emptyTrash"],
    mutationFn: () => apiClient.delete<{ purgedCount: number }>("/kb/pages/trash/empty"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTrash() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTree() });
    },
  });
}

export function useDuplicateKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:create", {
    mutationKey: ["kb", "pages", "duplicate"],
    mutationFn: (pageId: number) => apiClient.post<KbPage>(`/kb/pages/${pageId}/duplicate`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTree() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesRecent() });
    },
  });
}

export function useMoveKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pages", "move"],
    mutationFn: ({ pageId, ...data }: MoveKbPageInput & { pageId: number }) =>
      apiClient.post<KbPage>(`/kb/pages/${pageId}/move`, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTree() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.page(variables.pageId) });
    },
  });
}

export function useLockKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:manage", {
    mutationKey: ["kb", "pages", "lock"],
    mutationFn: ({ pageId, isLocked }: { pageId: number; isLocked: boolean }) =>
      apiClient.patch<KbPage>(`/kb/pages/${pageId}/lock`, { isLocked }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.page(variables.pageId) });
    },
  });
}

export function useToggleFavoriteKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:view", {
    mutationKey: ["kb", "pages", "toggleFavorite"],
    mutationFn: ({ pageId, isFavorite }: { pageId: number; isFavorite: boolean }) =>
      isFavorite
        ? apiClient.delete<{ success: boolean }>(`/kb/pages/${pageId}/favorite`)
        : apiClient.post<{ success: boolean }>(`/kb/pages/${pageId}/favorite`, {}),
    onMutate: async ({ pageId, isFavorite }) => {
      await qc.cancelQueries({ queryKey: queryKeys.kb.page(pageId) });
      const snapshot = qc.getQueryData<KbPageDetail>(queryKeys.kb.page(pageId));
      qc.setQueryData<KbPageDetail>(queryKeys.kb.page(pageId), (old) => {
        if (!old) return old;
        return { ...old, isFavorite: !isFavorite };
      });
      return { snapshot };
    },
    onError: (_, { pageId }, context) => {
      qc.setQueryData(queryKeys.kb.page(pageId), context?.snapshot);
    },
    onSettled: (_, _err, { pageId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.page(pageId) });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesFavorites() });
    },
  });
}

export function useRecordKbPageVisit() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:view", {
    mutationKey: ["kb", "pages", "visit"],
    mutationFn: (pageId: number) =>
      apiClient.post<{ success: boolean }>(`/kb/pages/${pageId}/visit`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesRecent() });
    },
  });
}

export function useSetKbPageVisibility() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pages", "visibility"],
    mutationFn: ({ pageId, visibility }: { pageId: number; visibility: "private" | "org" | "public" }) =>
      apiClient.patch<KbPageDetail>(`/kb/pages/${pageId}/visibility`, { visibility }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.page(variables.pageId) });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTree() });
    },
  });
}

export function useRestoreKbPageVersion() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pages", "restoreVersion"],
    mutationFn: ({ pageId, versionNumber }: { pageId: number; versionNumber: number }) =>
      apiClient.post<KbPage>(`/kb/pages/${pageId}/versions/${versionNumber}/restore`),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.page(variables.pageId) });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pageVersions(variables.pageId) });
    },
  });
}

export function usePublishKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pages", "publish"],
    mutationFn: (pageId: number) => apiClient.post<KbPageDetail>(`/kb/pages/${pageId}/publish`, {}),
    onSuccess: (_, pageId) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.page(pageId) });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTree() });
    },
  });
}

export function useArchiveKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pages", "archive"],
    mutationFn: (pageId: number) => apiClient.post<KbPageDetail>(`/kb/pages/${pageId}/archive`, {}),
    onSuccess: (_, pageId) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.page(pageId) });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTree() });
    },
  });
}

export function useUnarchiveKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pages", "unarchive"],
    mutationFn: (pageId: number) => apiClient.post<KbPageDetail>(`/kb/pages/${pageId}/unarchive`, {}),
    onSuccess: (_, pageId) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.page(pageId) });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTree() });
    },
  });
}

export function useVerifyKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:manage", {
    mutationKey: ["kb", "pages", "verify"],
    mutationFn: ({ pageId, intervalDays }: { pageId: number; intervalDays?: number }) =>
      apiClient.post<KbPageDetail>(`/kb/pages/${pageId}/verify`, { intervalDays }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.page(variables.pageId) });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTree() });
    },
  });
}

export function useMarkStaleKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:manage", {
    mutationKey: ["kb", "pages", "markStale"],
    mutationFn: (pageId: number) => apiClient.post<KbPageDetail>(`/kb/pages/${pageId}/mark-stale`, {}),
    onSuccess: (_, pageId) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.page(pageId) });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTree() });
    },
  });
}
