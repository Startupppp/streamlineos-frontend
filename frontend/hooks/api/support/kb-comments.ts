"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { usePermissionGate } from "@/hooks/api/access";
import { gated } from "@/lib/rbac/permission-gate";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import { selectFlatPages, type Page } from "@/lib/api/select-flat-pages";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const kbCommentListC = lazyContract(() =>
  import("./support-kb-schema").then((m) => m.kbCommentListContract),
);
const kbCommentRowC = lazyContract(() =>
  import("./support-kb-schema").then((m) => m.kbCommentRowContract),
);
const kbSuccessC = lazyContract(() =>
  import("./support-kb-schema").then((m) => m.kbSuccessContract),
);

interface KbArticleComment {
  id: number;
  articleId: number;
  body: string;
  userId: string | null;
  userName: string | null;
  userImage: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export function useSupportKbComments(articleId: number) {
  const access = usePermissionGate("support:kb:view");
  const qc = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: accountingAndSupportQueryKeys.kbComments.list(articleId),
    initialPageParam: NO_CURSOR_YET,
    queryFn: ({ signal, pageParam }) =>
      apiClient.get<Page<KbArticleComment>>(
        `/support/kb/articles/${articleId}/comments`,
        pageParam !== undefined ? { cursor: pageParam } : undefined,
        signal,
        kbCommentListC,
      ),
    getNextPageParam: (last) => last.pagination.nextCursor ?? undefined,
    select: selectFlatPages,
    enabled: access.allowed && Number.isFinite(articleId) && articleId > 0,
    staleTime: 30_000,
  });
  const refetch: typeof query.refetch = async (refetchOptions) => {
    if (access.unavailable) {
      await qc.refetchQueries({ queryKey: platformCoreQueryKeys.access.me() });
    }
    return query.refetch(refetchOptions);
  };
  return gated({ ...query, refetch }, access);
}

export function useAddSupportKbComment(articleId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:kb:manage", {
    mutationKey: ["supportKbComments", "add"],
    mutationFn: (body: string) =>
      apiClient.post<KbArticleComment>(
        `/support/kb/articles/${articleId}/comments`,
        { body },
        undefined,
        kbCommentRowC,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.kbComments.list(articleId) }),
  });
}

export function useDeleteSupportKbComment(articleId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:kb:manage", {
    mutationKey: ["supportKbComments", "delete"],
    mutationFn: (commentId: number) =>
      apiClient.delete<{ success: boolean }>(
        `/support/kb/articles/${articleId}/comments/${commentId}`,
        undefined,
        undefined,
        kbSuccessC,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.kbComments.list(articleId) }),
  });
}
