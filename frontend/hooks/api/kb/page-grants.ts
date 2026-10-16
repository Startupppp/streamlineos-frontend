"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import { selectFlatPages } from "@/lib/api/select-flat-pages";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

export type KbPageGrant = {
  id: number;
  pageId: number;
  membershipId: number | null;
  role: string | null;
  access: "view" | "comment" | "edit" | "manage";
  grantedByMembershipId: number | null;
  createdAt: string;
  revokedAt: string | null;
  granteeName: string | null;
  granteeEmail: string | null;
  granteeImage: string | null;
};

export type KbPageGrantsPage = {
  data: KbPageGrant[];
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
};

export type CreateKbPageGrantInput =
  | { membershipId: number; role?: never; access: KbPageGrant["access"] }
  | { role: string; membershipId?: never; access: KbPageGrant["access"] };

const kbPageGrantListContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-page-grants-schema").then((m) => m.kbPageGrantListContract),
);

const kbPageGrantContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-page-grants-schema").then((m) => m.kbPageGrantContract),
);

const noContentC = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

export function useKbPageGrants(pageId: number) {
  const canView = useCan("kb:pages:view");
  return useInfiniteQuery({
    ...INLINE_READ_ERROR,
    queryKey: knowledgeAndSurveysQueryKeys.kb.pageGrants(pageId),
    initialPageParam: NO_CURSOR_YET,
    queryFn: ({ signal, pageParam }) =>
      apiClient.get<KbPageGrantsPage>(
        `/kb/pages/${pageId}/grants`,
        pageParam !== undefined ? { cursor: pageParam } : undefined,
        signal,
        kbPageGrantListContract,
      ),
    getNextPageParam: (last) => last.pagination.nextCursor ?? undefined,
    select: selectFlatPages,
    staleTime: 30_000,
    enabled: canView && pageId > 0,
  });
}

export function useCreateKbPageGrant() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pageGrants", "create"],
    mutationFn: ({ pageId, ...body }: CreateKbPageGrantInput & { pageId: number }) =>
      apiClient.post<KbPageGrant>(
        `/kb/pages/${pageId}/grants`,
        body,
        undefined,
        kbPageGrantContract,
      ),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pageGrants(variables.pageId),
      });
    },
  });
}

export function useRevokeKbPageGrant() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pageGrants", "revoke"],
    mutationFn: ({ pageId, grantId }: { pageId: number; grantId: number }) =>
      apiClient.delete<void>(
        `/kb/pages/${pageId}/grants/${grantId}`,
        undefined,
        undefined,
        noContentC,
      ),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pageGrants(variables.pageId),
      });
    },
  });
}
