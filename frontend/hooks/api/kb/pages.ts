"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

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

export type KbPageListItem = Omit<KbPage, "content" | "contentText">;

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
  contentText: string | null;
  changeSummary: string | null;
  authorId: string | null;
  authorName: string | null;
  createdAt: string;
};

export type CreateKbPageInput = {
  parentPageId?: number | null;
  spaceId?: number | null;
  title?: string;
  templateId?: number | null;
  projectId?: number | null;
};

export type UpdateKbPageInput = {
  spaceId?: number | null;
  title?: string;
  icon?: string | null;
  coverImage?: string | null;
  content?: unknown;
  contentText?: string;
  changeSummary?: string;
  status?: "draft" | "in_review" | "published" | "archived";
  contentType?: string;
  ownerUserId?: string | null;
};

export type MoveKbPageInput = {
  parentPageId: number | null;
  index: number;
};

export function useKbPagesTree() {
  const canView = useCan("kb:pages:view");
  return useQuery({
    queryKey: queryKeys.kb.pagesTree(),
    queryFn: () => apiClient.get<KbPageTreeNode[]>("/kb/pages/tree"),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useKbProjectPagesTree(projectId: number) {
  const canView = useCan("kb:pages:view");
  return useQuery({
    queryKey: queryKeys.kb.pagesTreeByProject(projectId),
    queryFn: () => apiClient.get<KbPageTreeNode[]>("/kb/pages/tree", { projectId }),
    staleTime: 30_000,
    enabled: canView && Number.isFinite(projectId) && projectId > 0,
  });
}

export function useKbPagesRecent() {
  const canView = useCan("kb:pages:view");
  return useQuery({
    queryKey: queryKeys.kb.pagesRecent(),
    queryFn: () => apiClient.get<KbPageListItem[]>("/kb/pages/recent"),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useKbPagesFavorites() {
  const canView = useCan("kb:pages:view");
  return useQuery({
    queryKey: queryKeys.kb.pagesFavorites(),
    queryFn: () => apiClient.get<KbPageListItem[]>("/kb/pages/favorites"),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useKbPagesTrash() {
  const canView = useCan("kb:pages:view");
  return useQuery({
    queryKey: queryKeys.kb.pagesTrash(),
    queryFn: () => apiClient.get<KbPage[]>("/kb/pages/trash"),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useKbPagesSearch(q: string) {
  const canView = useCan("kb:pages:view");
  return useQuery({
    queryKey: queryKeys.kb.pagesSearch(q),
    queryFn: () => apiClient.get<KbPageSearchResult[]>("/kb/pages/search", { q }),
    staleTime: 0,
    enabled: canView && q.length > 0,
  });
}

export function useKbPage(pageId: number) {
  const canView = useCan("kb:pages:view");
  return useQuery({
    queryKey: queryKeys.kb.page(pageId),
    queryFn: () => apiClient.get<KbPageDetail>(`/kb/pages/${pageId}`),
    staleTime: 15_000,
    enabled: canView && Number.isFinite(pageId) && pageId > 0,
  });
}

export function useKbPageBacklinks(pageId: number) {
  const canView = useCan("kb:pages:view");
  return useQuery({
    queryKey: queryKeys.kb.pageBacklinks(pageId),
    queryFn: () => apiClient.get<KbPageBacklink[]>(`/kb/pages/${pageId}/backlinks`),
    staleTime: 60_000,
    enabled: canView && Number.isFinite(pageId) && pageId > 0,
  });
}

export function useKbPageVersions(pageId: number) {
  const canView = useCan("kb:pages:view");
  return useQuery({
    queryKey: queryKeys.kb.pageVersions(pageId),
    queryFn: () => apiClient.get<KbPageVersion[]>(`/kb/pages/${pageId}/versions`),
    staleTime: 60_000,
    enabled: canView && Number.isFinite(pageId) && pageId > 0,
  });
}

export function useKbPageVersion(pageId: number, versionNumber: number) {
  const canView = useCan("kb:pages:view");
  return useQuery({
    queryKey: queryKeys.kb.pageVersion(pageId, versionNumber),
    queryFn: () => apiClient.get<KbPageVersion>(`/kb/pages/${pageId}/versions/${versionNumber}`),
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
  return useMutation({
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
  return useMutation({
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

export function useEmptyKbTrash() {
  const qc = useQueryClient();
  return useMutation({
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
    onSuccess: (_, variables) => {
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
    onSuccess: (_, variables) => {
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
    onSuccess: (_, variables) => {
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
    onSuccess: (_, variables) => {
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
    onSuccess: (_, pageId) => {
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
    onSuccess: (_, pageId) => {
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
    onSuccess: (_, pageId) => {
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
    onSuccess: (_, variables) => {
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
    onSuccess: (_, pageId) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.page(pageId) });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTree() });
    },
  });
}
