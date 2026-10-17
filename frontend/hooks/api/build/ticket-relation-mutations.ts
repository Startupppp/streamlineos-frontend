"use client";

import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { Ticket } from "@/types/projects";
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

type TicketRelation = z.infer<
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

type RelationSnapshot = { previous: TicketRelation[] | undefined };

function relationsKey(ticketId: number) {
  return buildWorkQueryKeys.projects.ticketRelations(ticketId);
}

function markRelationAggregatesStale(
  queryClient: QueryClient,
  projectId: number,
  relatedTicketId: number,
) {
  void queryClient.invalidateQueries({
    queryKey: relationsKey(relatedTicketId),
    exact: true,
    refetchType: "none",
  });
  void queryClient.invalidateQueries({
    queryKey: buildWorkQueryKeys.projectReports.criticalPath(projectId),
    refetchType: "none",
  });
}

async function relatedTicketFrom(ticket: Ticket, projectKey: string | null) {
  const { ticketRelationListContract } = await import(
    "@/hooks/api/build/build-tickets-subresource-schema"
  );
  return ticketRelationListContract.element.shape.relatedTicket.safeParse({
    id: ticket.id,
    title: ticket.title,
    ticketNumber: ticket.ticketNumber,
    status: ticket.status,
    priority: ticket.priority,
    type: ticket.type,
    points: ticket.points,
    version: ticket.version,
    assigneeMembershipId: null,
    projectId: ticket.projectId,
    project: projectKey === null ? null : { key: projectKey },
    assignee: ticket.assignee ?? null,
  });
}

export function useAddTicketRelation(ticketId: number, projectId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:tickets:update", {
    mutationKey: ["projects", "tickets", "relations", "add"],
    mutationFn: ({
      relatedTicketId,
      relationType,
    }: {
      relatedTicketId: number;
      relationType: WorkItemRelationType;
      relatedTicket?: Ticket;
      projectKey?: string | null;
    }) =>
      apiClient.post<{ id: number }>(
        `/build/${projectId}/tickets/${ticketId}/relations`,
        { relatedTicketId, relationType },
        undefined,
        attachmentCreateResultLazy,
      ),
    onSuccess: async (created, variables) => {
      markRelationAggregatesStale(queryClient, projectId, variables.relatedTicketId);
      const parsed = variables.relatedTicket
        ? await relatedTicketFrom(variables.relatedTicket, variables.projectKey ?? null)
        : null;
      if (parsed?.success) {
        const relation: TicketRelation = {
          id: created.id,
          relationType: variables.relationType,
          direction: "outgoing",
          relatedTicket: parsed.data,
        };
        queryClient.setQueryData<TicketRelation[]>(relationsKey(ticketId), (old) => [
          ...(old ?? []).filter((existing) => existing.id !== relation.id),
          relation,
        ]);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: relationsKey(ticketId), exact: true });
    },
  });
}

export function useRemoveTicketRelation(ticketId: number, projectId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<void, Error, number, RelationSnapshot>("build:tickets:update", {
    mutationKey: ["projects", "tickets", "relations", "remove"],
    mutationFn: (relatedId: number) =>
      apiClient.delete<void>(
        `/build/${projectId}/tickets/${ticketId}/relations?relatedId=${relatedId}`,
        undefined,
        undefined,
        noContentLazy,
      ),
    onMutate: async (relatedId) => {
      await queryClient.cancelQueries({ queryKey: relationsKey(ticketId), exact: true });
      const previous = queryClient.getQueryData<TicketRelation[]>(relationsKey(ticketId));
      queryClient.setQueryData<TicketRelation[]>(relationsKey(ticketId), (old) =>
        old?.filter((relation) => relation.relatedTicket.id !== relatedId),
      );
      return { previous };
    },
    onError: (_error, _relatedId, context) => {
      if (context) queryClient.setQueryData(relationsKey(ticketId), context.previous);
    },
    onSuccess: (_data, relatedId) => {
      markRelationAggregatesStale(queryClient, projectId, relatedId);
    },
  });
}
