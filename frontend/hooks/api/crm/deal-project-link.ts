"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { customerWorkQueryKeys } from "@/lib/query-keys/customer-work";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const linkedProjectLazy = lazyContract(() =>
  import("@/hooks/api/crm/deals-schema").then((m) => m.dealLinkedProjectContract),
);
const linkResultLazy = lazyContract(() =>
  import("@/hooks/api/crm/deals-schema").then((m) => m.dealLinkProjectResultContract),
);

interface DealProjectLink {
  dealId: number;
  projectId: number;
}

/** The Build project delivering this deal, or null. */
export function useDealLinkedProject(dealId: number) {
  return useGatedQuery("crm:deals:read", {
    queryKey: customerWorkQueryKeys.deals.linkedProject(dealId),
    queryFn: ({ signal }) =>
      apiClient.get<DealProjectLink | null>(`/deals/${dealId}/linked-project`, undefined, signal, linkedProjectLazy),
    staleTime: 60_000,
    enabled: dealId > 0,
  });
}

export function useLinkDealProject(dealId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:deals:update", {
    mutationKey: ["deals", "linkProject"] as const,
    mutationFn: (projectId: number) =>
      apiClient.post<DealProjectLink>(`/deals/${dealId}/link-project`, { projectId }, undefined, linkResultLazy),
    onSuccess: (link) => {
      qc.setQueryData(customerWorkQueryKeys.deals.linkedProject(dealId), link);
    },
  });
}
