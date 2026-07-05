"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type KbPage = {
  id: number;
  orgId: string;
  spaceId: number | null;
  parentPageId: number | null;
  title: string;
  icon: string | null;
  coverImage: string | null;
  content: Record<string, unknown> | Record<string, unknown>[] | null;
  contentText: string | null;
  sortOrder: number;
  isLocked: boolean;
  createdById: string | null;
  lastEditedById: string | null;
  deletedAt: string | null;
  deletedById: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KbPageDetail = KbPage & {
  ancestors: Array<{ id: number; title: string }>;
  isFavorite: boolean;
  visibility: "private" | "org" | "public";
  publicToken: string | null;
  status: "draft" | "in_review" | "published" | "archived";
  contentType: string;
  trustState: "unverified" | "verified" | "verification_expired";
  ownerUserId: string | null;
  verifiedById: string | null;
  verifiedUntil: string | null;
  nextReviewAt: string | null;
  publicSlug: string | null;
};

export type KbPageTreeNode = {
  id: number;
  parentPageId: number | null;
  spaceId: number | null;
  title: string;
  icon: string | null;
  sortOrder: number;
  hasChildren: boolean;
  visibility: "private" | "org" | "public";
  createdById: string | null;
  status: string;
};

export type KbPageSearchResult = {
  id: number;
  title: string;
  icon: string | null;
  snippet: string;
};

export type KbPageBacklink = {
  id: number;
  title: string;
  icon: string | null;
};

export type KbPageVersion = {
  id: number;
  orgId: string;
  pageId: number;
  versionNumber: number;
  title: string;
  content: Record<string, unknown> | Record<string, unknown>[] | null;
  authorId: string | null;
  createdAt: string;
};

export type CreateKbPageInput = {
  parentPageId?: number | null;
  spaceId?: number | null;
  title?: string;
  templateId?: number | null;
};

export type UpdateKbPageInput = {
  spaceId?: number | null;
  title?: string;
  icon?: string | null;
  coverImage?: string | null;
  content?: unknown;
  contentText?: string;
  status?: "draft" | "in_review" | "published" | "archived";
  contentType?: string;
  ownerUserId?: string | null;
};

export type MoveKbPageInput = {
  parentPageId: number | null;
  index: number;
};

export function useKbPagesTree() {
  return useQuery({
    queryKey: queryKeys.kb.pagesTree(),
    queryFn: () => apiClient.get<KbPageTreeNode[]>("/kb/pages/tree"),
    staleTime: 30_000,
  });
}

export function useKbPagesRecent() {
  return useQuery({
    queryKey: queryKeys.kb.pagesRecent(),
    queryFn: () => apiClient.get<KbPage[]>("/kb/pages/recent"),
    staleTime: 30_000,
  });
}

export function useKbPagesFavorites() {
  return useQuery({
    queryKey: queryKeys.kb.pagesFavorites(),
    queryFn: () => apiClient.get<KbPage[]>("/kb/pages/favorites"),
    staleTime: 30_000,
  });
}

export function useKbPagesTrash() {
  return useQuery({
    queryKey: queryKeys.kb.pagesTrash(),
    queryFn: () => apiClient.get<KbPage[]>("/kb/pages/trash"),
    staleTime: 30_000,
  });
}

export function useKbPagesSearch(q: string) {
  return useQuery({
    queryKey: queryKeys.kb.pagesSearch(q),
    queryFn: () => apiClient.get<KbPageSearchResult[]>("/kb/pages/search", { q }),
    staleTime: 0,
    enabled: q.length > 0,
  });
}

export function useKbPage(pageId: number) {
  return useQuery({
    queryKey: queryKeys.kb.page(pageId),
    queryFn: () => apiClient.get<KbPageDetail>(`/kb/pages/${pageId}`),
    staleTime: 15_000,
    enabled: Number.isFinite(pageId) && pageId > 0,
  });
}

export function useKbPageBacklinks(pageId: number) {
  return useQuery({
    queryKey: queryKeys.kb.pageBacklinks(pageId),
    queryFn: () => apiClient.get<KbPageBacklink[]>(`/kb/pages/${pageId}/backlinks`),
    staleTime: 60_000,
    enabled: Number.isFinite(pageId) && pageId > 0,
  });
}

export function useKbPageVersions(pageId: number) {
  return useQuery({
    queryKey: queryKeys.kb.pageVersions(pageId),
    queryFn: () => apiClient.get<KbPageVersion[]>(`/kb/pages/${pageId}/versions`),
    staleTime: 60_000,
    enabled: Number.isFinite(pageId) && pageId > 0,
  });
}

export function useKbPageVersion(pageId: number, versionNumber: number) {
  return useQuery({
    queryKey: queryKeys.kb.pageVersion(pageId, versionNumber),
    queryFn: () => apiClient.get<KbPageVersion>(`/kb/pages/${pageId}/versions/${versionNumber}`),
    staleTime: 300_000,
    enabled:
      Number.isFinite(pageId) &&
      pageId > 0 &&
      Number.isFinite(versionNumber) &&
      versionNumber > 0,
  });
}

export function useCreateKbPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "pages", "create"],
    mutationFn: (input: CreateKbPageInput) => apiClient.post<KbPage>("/kb/pages", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTree() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesRecent() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.kbPages() });
    },
  });
}

export function useUpdateKbPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "pages", "update"],
    mutationFn: ({ pageId, ...data }: UpdateKbPageInput & { pageId: number }) =>
      apiClient.patch<KbPage>(`/kb/pages/${pageId}`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.page(variables.pageId) });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTree() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesRecent() });
    },
  });
}

export function useDeleteKbPage() {
  const qc = useQueryClient();
  return useMutation({
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
  return useMutation({
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
  return useMutation({
    mutationKey: ["kb", "pages", "hardDelete"],
    mutationFn: (pageId: number) => apiClient.delete<void>(`/kb/pages/${pageId}/permanent`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTrash() });
    },
  });
}

export function useDuplicateKbPage() {
  const qc = useQueryClient();
  return useMutation({
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
  return useMutation({
    mutationKey: ["kb", "pages", "move"],
    mutationFn: ({ pageId, ...data }: MoveKbPageInput & { pageId: number }) =>
      apiClient.post<KbPage>(`/kb/pages/${pageId}/move`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTree() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.page(variables.pageId) });
    },
  });
}

export function useLockKbPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "pages", "lock"],
    mutationFn: ({ pageId, isLocked }: { pageId: number; isLocked: boolean }) =>
      apiClient.patch<KbPage>(`/kb/pages/${pageId}/lock`, { isLocked }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.page(variables.pageId) });
    },
  });
}

export function useToggleFavoriteKbPage() {
  const qc = useQueryClient();
  return useMutation({
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
    onError: (_err, { pageId }, context) => {
      qc.setQueryData(queryKeys.kb.page(pageId), context?.snapshot);
    },
    onSettled: (_data, _err, { pageId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.page(pageId) });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesFavorites() });
    },
  });
}

export function useRecordKbPageVisit() {
  return useMutation({
    mutationKey: ["kb", "pages", "visit"],
    mutationFn: (pageId: number) =>
      apiClient.post<{ success: boolean }>(`/kb/pages/${pageId}/visit`),
  });
}

export function useSetKbPageVisibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "pages", "visibility"],
    mutationFn: ({ pageId, visibility }: { pageId: number; visibility: "private" | "org" | "public" }) =>
      apiClient.patch<KbPageDetail>(`/kb/pages/${pageId}/visibility`, { visibility }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.page(variables.pageId) });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTree() });
    },
  });
}

export function useRestoreKbPageVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "pages", "restoreVersion"],
    mutationFn: ({ pageId, versionNumber }: { pageId: number; versionNumber: number }) =>
      apiClient.post<KbPage>(`/kb/pages/${pageId}/versions/${versionNumber}/restore`),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.page(variables.pageId) });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pageVersions(variables.pageId) });
    },
  });
}

export function usePublishKbPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "pages", "publish"],
    mutationFn: (pageId: number) => apiClient.post<KbPageDetail>(`/kb/pages/${pageId}/publish`, {}),
    onSuccess: (_data, pageId) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.page(pageId) });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTree() });
    },
  });
}

export function useArchiveKbPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "pages", "archive"],
    mutationFn: (pageId: number) => apiClient.post<KbPageDetail>(`/kb/pages/${pageId}/archive`, {}),
    onSuccess: (_data, pageId) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.page(pageId) });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTree() });
    },
  });
}

export function useUnarchiveKbPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "pages", "unarchive"],
    mutationFn: (pageId: number) => apiClient.post<KbPageDetail>(`/kb/pages/${pageId}/unarchive`, {}),
    onSuccess: (_data, pageId) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.page(pageId) });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTree() });
    },
  });
}

export function useVerifyKbPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "pages", "verify"],
    mutationFn: ({ pageId, intervalDays }: { pageId: number; intervalDays?: number }) =>
      apiClient.post<KbPageDetail>(`/kb/pages/${pageId}/verify`, { intervalDays }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.page(variables.pageId) });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTree() });
    },
  });
}

export function useMarkStaleKbPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "pages", "markStale"],
    mutationFn: (pageId: number) => apiClient.post<KbPageDetail>(`/kb/pages/${pageId}/mark-stale`, {}),
    onSuccess: (_data, pageId) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.page(pageId) });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTree() });
    },
  });
}
