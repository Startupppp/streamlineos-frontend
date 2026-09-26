"use client";

import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";
import { useKbSpaces } from "./spaces";
import { kbPageTreeLevelContract } from "./kb-page-tree-schema";
import type { KbSpaceListPage } from "./spaces";
import type { KbPageTrashPurgeImpact } from "./kb-pages-schema";
import type {
  CreateKbPageInput,
  KbPage,
  KbPageBacklink,
  KbPageDetail,
  KbPageListItem,
  KbPageSearchPage,
  KbPageTreeNode,
  MoveKbPageInput,
  UpdateKbPageInput,
} from "./page-types";

type KbPageTreeLevel = {
  data: KbPageTreeNode[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
};

export const ACL_VERSION_SPACE_LIMIT = 100;

export function deriveAclVersion(page: KbSpaceListPage | undefined): string {
  if (page === undefined) return "";
  const ids = page.data.map((s) => s.id).sort((a, b) => a - b);
  return page.pagination.hasMore ? `${ids.join(",")}~truncated` : ids.join(",");
}

function treeLevelKey(params: {
  parentId?: number;
  spaceId?: number;
  projectId?: number;
  cursor?: string;
}) {
  return [
    ...knowledgeAndSurveysQueryKeys.kb.pagesTree(),
    "level",
    params,
  ] as const;
}

const kbPageSearchResponseContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-pages-schema").then(
    (m) => m.kbPageSearchResponseContract,
  ),
);

const kbPageWithAncestorsContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-pages-schema").then(
    (m) => m.kbPageWithAncestorsContract,
  ),
);
const kbPageContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-pages-schema").then((m) => m.kbPageContract),
);
const kbPageListContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-pages-schema").then((m) => m.kbPageListContract),
);

const kbPageBacklinkContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-pages-schema").then(
    (m) => m.kbPageBacklinkContract,
  ),
);

const kbPageSoftDeleteContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-pages-schema").then(
    (m) => m.kbPageSoftDeleteContract,
  ),
);

const kbTrashPageListContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-pages-schema").then(
    (m) => m.kbTrashPageListContract,
  ),
);

const kbPageTrashPurgeImpactContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-pages-schema").then(
    (m) => m.kbPageTrashPurgeImpactContract,
  ),
);

const kbBulkPageResultContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-pages-schema").then(
    (m) => m.kbBulkPageResultContract,
  ),
);

const kbPageEmptyTrashContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-pages-schema").then(
    (m) => m.kbPageEmptyTrashContract,
  ),
);

const kbPageSuccessContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-pages-schema").then((m) => m.kbPageSuccessContract),
);

const kbPagePermanentDeleteContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-pages-schema").then(
    (m) => m.kbPagePermanentDeleteContract,
  ),
);

export function useKbProjectPagesTree(projectId: number) {
  const canView = useCan("kb:pages:view");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTreeByProject(projectId),
    queryFn: async ({ signal }) => {
      const page = await apiClient.get<KbPageTreeLevel>(
        "/kb/pages/tree",
        { projectId },
        signal,
        kbPageTreeLevelContract,
      );
      return page.data;
    },
    staleTime: 30_000,
    enabled: canView && Number.isFinite(projectId) && projectId > 0,
  });
}

export function useKbPageTreeInfinite(params: {
  spaceId?: number;
  projectId?: number;
}) {
  const canView = useCan("kb:pages:view");
  return useInfiniteQuery({
    ...INLINE_READ_ERROR,
    queryKey: [...treeLevelKey(params), "infinite"] as const,
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<KbPageTreeLevel>(
        "/kb/pages/tree",
        {
          ...params,
          ...(pageParam === undefined ? {} : { cursor: pageParam }),
        },
        signal,
        kbPageTreeLevelContract,
      ),
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.nextCursor ?? undefined,
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useKbPageChildrenLevel(
  nodeId: number,
  enabled: boolean,
  spaceId?: number,
) {
  const canView = useCan("kb:pages:view");
  return useInfiniteQuery({
    queryKey: [
      ...treeLevelKey({ parentId: nodeId, spaceId }),
      "infinite",
    ] as const,
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<KbPageTreeLevel>(
        "/kb/pages/tree",
        {
          parentId: nodeId,
          ...(spaceId === undefined ? {} : { spaceId }),
          ...(pageParam === undefined ? {} : { cursor: pageParam }),
        },
        signal,
        kbPageTreeLevelContract,
      ),
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.nextCursor ?? undefined,
    staleTime: 30_000,
    enabled: canView && enabled,
  });
}

export function useKbPagesRecent() {
  const canView = useCan("kb:pages:view");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.pagesRecent(),
    queryFn: ({ signal }) =>
      apiClient.get<KbPageListItem[]>(
        "/kb/pages/recent",
        undefined,
        signal,
        kbPageListContract,
      ),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useKbPagesFavorites() {
  const canView = useCan("kb:pages:view");
  return useQuery({
    ...INLINE_READ_ERROR,
    queryKey: knowledgeAndSurveysQueryKeys.kb.pagesFavorites(),
    queryFn: ({ signal }) =>
      apiClient.get<KbPageListItem[]>(
        "/kb/pages/favorites",
        undefined,
        signal,
        kbPageListContract,
      ),
    staleTime: 30_000,
    enabled: canView,
  });
}

export type TrashPageParams = {
  cursor?: string;
  limit?: number;
  q?: string;
  spaceId?: number;
  deletedByMembershipId?: number;
  deletedFrom?: string;
  deletedBefore?: string;
};

export type KbTrashCursorPage = {
  data: KbPageListItem[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
};

export function useKbPagesTrash(params?: TrashPageParams) {
  const canView = useCan("kb:pages:view");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTrashList(params),
    queryFn: ({ signal }) =>
      apiClient.get<KbTrashCursorPage>(
        "/kb/pages/trash",
        params,
        signal,
        kbTrashPageListContract,
      ),
    staleTime: 30_000,
    enabled: canView,
  });
}

export type BulkPageResult = {
  results: Array<{
    pageId: number;
    result: "succeeded" | "denied" | "conflict" | "notFound";
  }>;
};

export function useKbBulkRestorePages() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pages", "trash", "bulk-restore"],
    mutationFn: (pageIds: number[]) =>
      apiClient.post<BulkPageResult>(
        "/kb/pages/trash/restore",
        { pageIds },
        operation.configFor({ pageIds }),
        kbBulkPageResultContract,
      ),
    onSuccess: () => {
      operation.settle();
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTrash(),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTree(),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.kbPages(),
      });
    },
  });
}

export function useKbTrashPurgeImpact(
  pageIds: number[],
  options?: { enabled?: boolean },
) {
  const canPurge = useCan("kb:pages:purge");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTrashPurgeImpact(pageIds),
    queryFn: ({ signal }) =>
      apiClient.post<KbPageTrashPurgeImpact>(
        "/kb/pages/trash/purge-impact",
        { pageIds },
        { signal },
        kbPageTrashPurgeImpactContract,
      ),
    staleTime: 15_000,
    enabled: canPurge && pageIds.length > 0 && (options?.enabled ?? true),
  });
}

export function useKbBulkPurgePages() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("kb:pages:purge", {
    mutationKey: ["kb", "pages", "trash", "bulk-purge"],
    mutationFn: (pageIds: number[]) =>
      apiClient.delete<BulkPageResult>(
        "/kb/pages/trash/purge",
        { pageIds },
        operation.configFor({ pageIds }),
        kbBulkPageResultContract,
      ),
    onSuccess: () => {
      operation.settle();
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTrash(),
      });
    },
  });
}

export function useKbPagesSearch(q: string) {
  const canView = useCan("kb:pages:view");
  const { data: spaces, isLoading: spacesLoading } = useKbSpaces({
    limit: ACL_VERSION_SPACE_LIMIT,
  });
  const aclVersion = spacesLoading ? null : deriveAclVersion(spaces);
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.pagesSearch(q, aclVersion ?? ""),
    queryFn: ({ signal }) =>
      apiClient.get<KbPageSearchPage>(
        "/kb/pages/search",
        { q },
        signal,
        kbPageSearchResponseContract,
      ),
    staleTime: 0,
    enabled: canView && q.length > 0 && aclVersion !== null,
  });
}

export function useKbPage(pageId: number) {
  const canView = useCan("kb:pages:view");
  return useQuery({
    ...INLINE_READ_ERROR,
    queryKey: knowledgeAndSurveysQueryKeys.kb.page(pageId),
    queryFn: ({ signal }) =>
      apiClient.get<KbPageDetail>(
        `/kb/pages/${pageId}`,
        undefined,
        signal,
        kbPageWithAncestorsContract,
      ),
    staleTime: 15_000,
    enabled: canView && Number.isFinite(pageId) && pageId > 0,
  });
}

export function useKbPageBacklinks(pageId: number) {
  const canView = useCan("kb:pages:view");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.pageBacklinks(pageId),
    queryFn: ({ signal }) =>
      apiClient.get<KbPageBacklink[]>(
        `/kb/pages/${pageId}/backlinks`,
        undefined,
        signal,
        kbPageBacklinkContract,
      ),
    staleTime: 60_000,
    enabled: canView && Number.isFinite(pageId) && pageId > 0,
  });
}

export function useCreateKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:create", {
    mutationKey: ["kb", "pages", "create"],
    mutationFn: (input: CreateKbPageInput) =>
      apiClient.post<KbPage>("/kb/pages", input, undefined, kbPageContract),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTree(),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pagesRecent(),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.kbPages(),
      });
      if (variables.projectId) {
        qc.invalidateQueries({
          queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTreeByProject(
            variables.projectId,
          ),
        });
      }
    },
  });
}

function applyUpdatedKbPage(updated: KbPage) {
  return function patchCachedDetail(
    cached: KbPageDetail | undefined,
  ): KbPageDetail | undefined {
    if (!cached) return cached;
    return { ...cached, ...updated };
  };
}

function touchesKbPageListings(variables: UpdateKbPageInput): boolean {
  return (
    variables.title !== undefined ||
    variables.icon !== undefined ||
    variables.coverImage !== undefined ||
    variables.spaceId !== undefined ||
    variables.status !== undefined
  );
}

export function useUpdateKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pages", "update"],
    mutationFn: ({ pageId, ...data }: UpdateKbPageInput & { pageId: number }) =>
      apiClient.patch<KbPage>(
        `/kb/pages/${pageId}`,
        data,
        undefined,
        kbPageContract,
      ),
    onSuccess: (updated, variables) => {
      qc.setQueryData<KbPageDetail>(
        knowledgeAndSurveysQueryKeys.kb.page(variables.pageId),
        applyUpdatedKbPage(updated),
      );
      if (!touchesKbPageListings(variables)) return;
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTree(),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pagesRecent(),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pagesFavorites(),
      });
    },
  });
}

export function useDeleteKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:delete", {
    mutationKey: ["kb", "pages", "delete"],
    mutationFn: (pageId: number) =>
      apiClient.delete<{ deletedCount: number }>(
        `/kb/pages/${pageId}`,
        undefined,
        undefined,
        kbPageSoftDeleteContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTree(),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTrash(),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.kbPages(),
      });
    },
  });
}

export function useRestoreKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pages", "restore"],
    mutationFn: (pageId: number) =>
      apiClient.post<{ success: boolean }>(
        `/kb/pages/${pageId}/restore`,
        undefined,
        undefined,
        kbPageSuccessContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTree(),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTrash(),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.kbPages(),
      });
    },
  });
}

export function useHardDeleteKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:purge", {
    mutationKey: ["kb", "pages", "hardDelete"],
    mutationFn: (pageId: number) =>
      apiClient.delete<undefined>(
        `/kb/pages/${pageId}/permanent`,
        undefined,
        undefined,
        kbPagePermanentDeleteContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTrash(),
      });
    },
  });
}

export function useEmptyKbTrash() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("kb:pages:purge", {
    mutationKey: ["kb", "pages", "emptyTrash"],
    mutationFn: () =>
      apiClient.delete<{ purgedCount: number }>(
        "/kb/pages/trash/empty",
        undefined,
        operation.configFor({ command: "kb.pages.trash-empty" }),
        kbPageEmptyTrashContract,
      ),
    onSuccess: () => {
      operation.settle();
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTrash(),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTree(),
      });
    },
  });
}

export function useDuplicateKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:create", {
    mutationKey: ["kb", "pages", "duplicate"],
    mutationFn: (pageId: number) =>
      apiClient.post<KbPage>(
        `/kb/pages/${pageId}/duplicate`,
        undefined,
        undefined,
        kbPageContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTree(),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pagesRecent(),
      });
    },
  });
}

export function useMoveKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pages", "move"],
    mutationFn: ({ pageId, ...data }: MoveKbPageInput & { pageId: number }) =>
      apiClient.post<{ success: boolean }>(
        `/kb/pages/${pageId}/move`,
        data,
        undefined,
        kbPageSuccessContract,
      ),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTree(),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.page(variables.pageId),
      });
    },
  });
}

export function useLockKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:manage", {
    mutationKey: ["kb", "pages", "lock"],
    mutationFn: ({ pageId, isLocked }: { pageId: number; isLocked: boolean }) =>
      apiClient.patch<KbPage>(
        `/kb/pages/${pageId}/lock`,
        { isLocked },
        undefined,
        kbPageContract,
      ),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.page(variables.pageId),
      });
    },
  });
}

export function useToggleFavoriteKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:view", {
    mutationKey: ["kb", "pages", "toggleFavorite"],
    mutationFn: ({
      pageId,
      isFavorite,
    }: {
      pageId: number;
      isFavorite: boolean;
    }) =>
      isFavorite
        ? apiClient.delete<{ success: boolean }>(
            `/kb/pages/${pageId}/favorite`,
            undefined,
            undefined,
            kbPageSuccessContract,
          )
        : apiClient.post<{ success: boolean }>(
            `/kb/pages/${pageId}/favorite`,
            {},
            undefined,
            kbPageSuccessContract,
          ),
    onMutate: async ({ pageId, isFavorite }) => {
      await qc.cancelQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.page(pageId),
      });
      const snapshot = qc.getQueryData<KbPageDetail>(
        knowledgeAndSurveysQueryKeys.kb.page(pageId),
      );
      qc.setQueryData<KbPageDetail>(
        knowledgeAndSurveysQueryKeys.kb.page(pageId),
        (old) => {
          if (!old) return old;
          return { ...old, isFavorite: !isFavorite };
        },
      );
      return { snapshot };
    },
    onError: (_, { pageId }, context) => {
      qc.setQueryData(
        knowledgeAndSurveysQueryKeys.kb.page(pageId),
        context?.snapshot,
      );
    },
    onSettled: (_, _err, { pageId }) => {
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.page(pageId),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pagesFavorites(),
      });
    },
  });
}

export function useRecordKbPageVisit() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:view", {
    mutationKey: ["kb", "pages", "visit"],
    mutationFn: (pageId: number) =>
      apiClient.post<{ success: boolean }>(
        `/kb/pages/${pageId}/visit`,
        undefined,
        undefined,
        kbPageSuccessContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pagesRecent(),
      });
    },
  });
}

export function useSetKbPageVisibility() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pages", "visibility"],
    mutationFn: ({
      pageId,
      visibility,
    }: {
      pageId: number;
      visibility: "private" | "org" | "public";
    }) =>
      apiClient.patch<KbPage>(
        `/kb/pages/${pageId}/visibility`,
        { visibility },
        undefined,
        kbPageContract,
      ),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.page(variables.pageId),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTree(),
      });
    },
  });
}

export function usePublishKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pages", "publish"],
    mutationFn: (pageId: number) =>
      apiClient.post<KbPage>(
        `/kb/pages/${pageId}/publish`,
        {},
        undefined,
        kbPageContract,
      ),
    onSuccess: (_, pageId) => {
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.page(pageId),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTree(),
      });
    },
  });
}

export function useArchiveKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pages", "archive"],
    mutationFn: (pageId: number) =>
      apiClient.post<KbPage>(
        `/kb/pages/${pageId}/archive`,
        {},
        undefined,
        kbPageContract,
      ),
    onSuccess: (_, pageId) => {
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.page(pageId),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTree(),
      });
    },
  });
}

export function useUnarchiveKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pages", "unarchive"],
    mutationFn: (pageId: number) =>
      apiClient.post<KbPage>(
        `/kb/pages/${pageId}/unarchive`,
        {},
        undefined,
        kbPageContract,
      ),
    onSuccess: (_, pageId) => {
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.page(pageId),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTree(),
      });
    },
  });
}

export function useVerifyKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:manage", {
    mutationKey: ["kb", "pages", "verify"],
    mutationFn: ({
      pageId,
      intervalDays,
    }: {
      pageId: number;
      intervalDays?: number;
    }) =>
      apiClient.post<KbPage>(
        `/kb/pages/${pageId}/verify`,
        { intervalDays },
        undefined,
        kbPageContract,
      ),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.page(variables.pageId),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTree(),
      });
    },
  });
}

export function useMarkStaleKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:manage", {
    mutationKey: ["kb", "pages", "markStale"],
    mutationFn: (pageId: number) =>
      apiClient.post<KbPage>(
        `/kb/pages/${pageId}/mark-stale`,
        {},
        undefined,
        kbPageContract,
      ),
    onSuccess: (_, pageId) => {
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.page(pageId),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTree(),
      });
    },
  });
}
