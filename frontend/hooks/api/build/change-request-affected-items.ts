"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import type {
  ChangeRequestAffectedItem,
  ChangeRequestAffectedItemPage,
  LinkAffectedTicketInput,
} from "@/types/projects";

const changeRequestAffectedItemListContract = lazyContract(() =>
  import("@/hooks/api/build/client-portal-schema").then((m) => m.changeRequestAffectedItemListContract),
);
const changeRequestAffectedItemContract = lazyContract(() =>
  import("@/hooks/api/build/client-portal-schema").then((m) => m.changeRequestAffectedItemContract),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

export interface AffectedTicketsFilters {
  cursor?: string;
  limit?: number;
}

export function useChangeRequestAffectedTickets(
  projectId: number,
  changeRequestId: number,
  filters?: AffectedTicketsFilters,
) {
  const canView = useCan("build:changerequests:view");
  const params: Record<string, string> = {};
  if (filters?.cursor) params["cursor"] = filters.cursor;
  if (filters?.limit !== undefined) params["limit"] = String(filters.limit);

  const activeFilters: AffectedTicketsFilters = {};
  if (filters?.cursor) activeFilters.cursor = filters.cursor;
  if (filters?.limit !== undefined) activeFilters.limit = filters.limit;

  return useQuery<ChangeRequestAffectedItemPage>({
    queryKey: buildWorkQueryKeys.projects.changeRequests.affectedTickets(
      projectId,
      changeRequestId,
      Object.keys(activeFilters).length > 0 ? activeFilters : undefined,
    ),
    queryFn: ({ signal }) =>
      apiClient.get<ChangeRequestAffectedItemPage>(
        `/build/${projectId}/change-requests/${changeRequestId}/affected-tickets`,
        params,
        signal,
        changeRequestAffectedItemListContract,
      ),
    enabled: canView && !!projectId && !!changeRequestId,
    staleTime: 30_000,
  });
}

export function useLinkAffectedTicket(projectId: number, changeRequestId: number) {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<ChangeRequestAffectedItem, Error, LinkAffectedTicketInput>(
    "build:changerequests:manage",
    {
      mutationKey: ["projects", projectId, "change-requests", changeRequestId, "affected-tickets", "link"],
      mutationFn: (input, idempotencyKey) =>
        apiClient.post<ChangeRequestAffectedItem>(
          `/build/${projectId}/change-requests/${changeRequestId}/affected-tickets`,
          input,
          { headers: { "Idempotency-Key": idempotencyKey } },
          changeRequestAffectedItemContract,
        ),
      onSuccess: () => {
        qc.invalidateQueries({
          queryKey: buildWorkQueryKeys.projects.changeRequests.affectedTickets(projectId, changeRequestId),
        });
      },
    },
  );
}

export function useUnlinkAffectedTicket(projectId: number, changeRequestId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:changerequests:manage", {
    mutationKey: ["projects", projectId, "change-requests", changeRequestId, "affected-tickets", "unlink"],
    mutationFn: (affectedItemId: number) =>
      apiClient.delete<void>(
        `/build/${projectId}/change-requests/${changeRequestId}/affected-tickets/${affectedItemId}`,
        undefined,
        undefined,
        noContentContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.changeRequests.affectedTickets(projectId, changeRequestId),
      });
    },
  });
}
