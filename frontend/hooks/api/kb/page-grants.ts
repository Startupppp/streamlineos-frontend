"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type KbPageGrant = {
  id: number;
  pageId: number;
  membershipId: number | null;
  role: string | null;
  access: "view" | "comment" | "edit";
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
  | { membershipId: number; role?: never; access: "view" | "comment" | "edit" }
  | { role: string; membershipId?: never; access: "view" | "comment" | "edit" };

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
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.pageGrants(pageId),
    queryFn: ({ signal }) =>
      apiClient.get<KbPageGrantsPage>(
        `/kb/pages/${pageId}/grants`,
        { limit: "100" },
        signal,
        kbPageGrantListContract,
      ),
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
