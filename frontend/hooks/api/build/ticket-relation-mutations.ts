"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { ticketRelationListContract as ticketRelationListContractDef } from "@/hooks/api/build/build-tickets-subresource-schema";

const noContentLazy = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
const attachmentCreateResultLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-subresource-schema").then(
    (m) => m.attachmentCreateResultContract,
  ),
);
const ticketRelationListLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-subresource-schema").then(
    (m) => m.ticketRelationListContract,
  ),
);

export type TicketRelation = z.infer<
  typeof ticketRelationListContractDef
>[number];
export type WorkItemRelationType = TicketRelation["relationType"];

export function useTicketRelations(ticketId: number, projectId: number) {
  const canView = useCan("build:tickets:view");
  return useQuery({
    ...INLINE_READ_ERROR,
    queryKey: buildWorkQueryKeys.projects.ticketRelations(ticketId),
    queryFn: ({ signal }) =>
      apiClient.get<TicketRelation[]>(
        `/build/${projectId}/tickets/${ticketId}/relations`,
        undefined,
        signal,
        ticketRelationListLazy,
      ),
    staleTime: 2 * 60_000,
    enabled: canView && !!ticketId && !!projectId,
  });
}

export function useAddTicketRelation(ticketId: number, projectId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:tickets:update", {
    mutationKey: ["projects", "tickets", "relations", "add"],
    mutationFn: (data: {
      relatedTicketId: number;
      relationType: WorkItemRelationType;
    }) =>
      apiClient.post<{ id: number }>(
        `/build/${projectId}/tickets/${ticketId}/relations`,
        data,
        undefined,
        attachmentCreateResultLazy,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.ticketRelations(ticketId),
      });
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projectReports.criticalPath(projectId),
        refetchType: "none",
      });
    },
  });
}

export function useRemoveTicketRelation(ticketId: number, projectId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:tickets:update", {
    mutationKey: ["projects", "tickets", "relations", "remove"],
    mutationFn: (relatedId: number) =>
      apiClient.delete<void>(
        `/build/${projectId}/tickets/${ticketId}/relations?relatedId=${relatedId}`,
        undefined,
        undefined,
        noContentLazy,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.ticketRelations(ticketId),
      });
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projectReports.criticalPath(projectId),
        refetchType: "none",
      });
    },
  });
}
