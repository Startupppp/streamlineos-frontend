"use client";
import { useQueryClient } from "@tanstack/react-query";
import type { QueryClient, UseMutationOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type {
  Ticket,
  UpdateTicketInput,
  ProjectWithDetails,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";
import { ticketUpdateRequestContract } from "./build-tickets-subresource-schema";
import {
  patchTicketCollections,
  patchAllWorkCollections,
  revalidateAllWorkCollections,
  restoreTicketCollections,
  restoreAllWorkCollections,
  rollbackTicketFields,
  ticketRollback,
  type TicketSnapshots,
  type AllWorkSnapshots,
  resolveTicketVersions,
  resolveTicketStatus,
} from "./ticket-cache";
import { invalidateTicketUpdateViews } from "./ticket-cache-invalidation";
import { enqueueTicketWrite } from "./ticket-write-queue";
import {
  beginStatusTransition,
  type StatusTransition,
} from "./ticket-status-queue";
import { reconcileStatusTransition } from "./ticket-status-cache";
import {
  applyAllWorkTicketPatch,
  applyTicketPatch,
} from "./ticket-optimistic-patch";
export {
  applyAllWorkTicketPatch,
  applyTicketPatch,
} from "./ticket-optimistic-patch";

const ticketUpdateResultLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-subresource-schema").then(
    (m) => m.ticketUpdateResultContract,
  ),
);
interface UpdateTicketResponse {
  updated: boolean;
  updatedAt: string;
  version: number;
}
interface UpdateTicketContext {
  detailKey: readonly unknown[];
  ticketKey: readonly unknown[];
  previousDetail: ProjectWithDetails | null | undefined;
  previousTicket: Ticket | null | undefined;
  optimisticDetail: ProjectWithDetails | null | undefined;
  optimisticTicket: Ticket | null | undefined;
  listSnapshots: TicketSnapshots;
  allWorkSnapshots: AllWorkSnapshots;
  statusTransition?: StatusTransition;
}
function reconcileTicketVersion(
  queryClient: QueryClient,
  projectId: number,
  ticketId: number,
  response: UpdateTicketResponse,
): void {
  const apply = (ticket: Ticket) =>
    ticket.id === ticketId
      ? { ...ticket, updatedAt: response.updatedAt, version: response.version }
      : ticket;
  patchTicketCollections(queryClient, projectId, apply);
  patchAllWorkCollections(queryClient, projectId, (ticket) =>
    ticket.id === ticketId
      ? { ...ticket, updatedAt: response.updatedAt, version: response.version }
      : ticket,
  );
  queryClient.setQueryData<Ticket | null>(
    buildWorkQueryKeys.projects.ticket(projectId, ticketId),
    (current) => (current ? apply(current) : current),
  );
  queryClient.setQueryData<ProjectWithDetails | null>(
    buildWorkQueryKeys.projects.detail(projectId),
    (current) =>
      current?.tickets
        ? { ...current, tickets: current.tickets.map(apply) }
        : current,
  );
}
export function useUpdateTicket(
  projectId: number,
  options?: Omit<
    UseMutationOptions<
      UpdateTicketResponse,
      Error,
      UpdateTicketInput,
      UpdateTicketContext
    >,
    "mutationFn" | "mutationKey" | "onMutate"
  >,
) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    UpdateTicketResponse,
    Error,
    UpdateTicketInput,
    UpdateTicketContext
  >("build:tickets:update", {
    ...options,
    mutationKey: ["projects", "tickets", "update"],
    mutationFn: ({ ticketId, ...data }) =>
      enqueueTicketWrite(projectId, ticketId, () => {
        const versions = resolveTicketVersions(queryClient, projectId, [
          ticketId,
        ]);
        const request = {
          ...data,
          version: versions.versions[String(ticketId)] ?? data.version,
        };
        ticketUpdateRequestContract.parse(request);
        return apiClient
          .patch<UpdateTicketResponse>(
            `/build/${projectId}/tickets/${ticketId}`,
            request,
            undefined,
            ticketUpdateResultLazy,
          )
          .then((response) => {
            reconcileTicketVersion(queryClient, projectId, ticketId, response);
            return response;
          });
      }),
    onMutate: async (variables) => {
      const detailKey = buildWorkQueryKeys.projects.detail(projectId);
      const ticketKey = buildWorkQueryKeys.projects.ticket(
        projectId,
        variables.ticketId,
      );
      await Promise.all([
        queryClient.cancelQueries({ queryKey: detailKey }),
        queryClient.cancelQueries({ queryKey: ticketKey }),
        queryClient.cancelQueries({
          queryKey: buildWorkQueryKeys.projects.tickets({ projectId }),
        }),
        queryClient.cancelQueries({
          queryKey: buildWorkQueryKeys.projects.allWorkAll,
        }),
      ]);
      const previousDetail =
        queryClient.getQueryData<ProjectWithDetails | null>(detailKey);
      const previousTicket = queryClient.getQueryData<Ticket | null>(ticketKey);
      const currentStatus = resolveTicketStatus(
        queryClient,
        projectId,
        variables.ticketId,
      );
      const statusTransition =
        variables.status !== undefined && currentStatus !== undefined
          ? beginStatusTransition(projectId, variables.ticketId, currentStatus, variables.status)
          : undefined;
      const members = previousDetail?.members ?? [];
      const listSnapshots = patchTicketCollections(
        queryClient,
        projectId,
        (ticket) =>
          ticket.id === variables.ticketId
            ? applyTicketPatch(ticket, variables, members)
            : ticket,
      );
      const allWorkSnapshots = patchAllWorkCollections(
        queryClient,
        projectId,
        (ticket) =>
          ticket.id === variables.ticketId
            ? applyAllWorkTicketPatch(ticket, variables, members)
            : ticket,
      );
      if (previousDetail?.tickets) {
        queryClient.setQueryData<ProjectWithDetails | null>(
          detailKey,
          (old) => {
            if (!old?.tickets) return old;
            return {
              ...old,
              tickets: old.tickets.map((t) =>
                t.id === variables.ticketId
                  ? applyTicketPatch(t, variables, members)
                  : t,
              ),
            };
          },
        );
      }
      if (previousTicket) {
        queryClient.setQueryData<Ticket | null>(ticketKey, (old) =>
          old ? applyTicketPatch(old, variables, members) : old,
        );
      }
      if (
        statusTransition &&
        statusTransition.fromStatus !== statusTransition.toStatus
      ) {
        const oldStatus = statusTransition.fromStatus;
        const newStatus = statusTransition.toStatus;
        for (const [key, counts] of queryClient.getQueriesData<
          Record<string, number>
        >({ queryKey: buildWorkQueryKeys.projects.columnCounts(projectId) })) {
          if (!counts) continue;
          queryClient.setQueryData<Record<string, number>>(key, {
            ...counts,
            [oldStatus]: Math.max(0, (counts[oldStatus] ?? 0) - 1),
            [newStatus]: (counts[newStatus] ?? 0) + 1,
          });
        }
      }
      return {
        detailKey,
        ticketKey,
        previousDetail,
        previousTicket,
        optimisticDetail: queryClient.getQueryData<ProjectWithDetails | null>(
          detailKey,
        ),
        optimisticTicket: queryClient.getQueryData<Ticket | null>(ticketKey),
        listSnapshots,
        allWorkSnapshots,
        statusTransition,
      };
    },
    onError: (error, variables, context, mutFnCtx) => {
      if (context) {
        const restore = ticketRollback(
          context.previousDetail?.tickets ?? [],
          context.optimisticDetail?.tickets ?? [],
        );
        queryClient.setQueryData<ProjectWithDetails | null>(
          context.detailKey,
          (current) =>
            current?.tickets
              ? { ...current, tickets: current.tickets.map(restore) }
              : current,
        );
        queryClient.setQueryData<Ticket | null>(context.ticketKey, (current) =>
          current && context.previousTicket && context.optimisticTicket
            ? rollbackTicketFields(
                current,
                context.previousTicket,
                context.optimisticTicket,
              )
            : current,
        );
        restoreTicketCollections(queryClient, context.listSnapshots);
        restoreAllWorkCollections(queryClient, context.allWorkSnapshots);
        reconcileStatusTransition(
          queryClient,
          projectId,
          variables.ticketId,
          context.statusTransition,
          false,
        );
      }
      options?.onError?.(error, variables, context, mutFnCtx);
    },
    onSuccess: (data, variables, context, mutFnCtx) => {
      reconcileStatusTransition(
        queryClient,
        projectId,
        variables.ticketId,
        context?.statusTransition,
        true,
      );
      revalidateAllWorkCollections(
        queryClient,
        context?.allWorkSnapshots ?? [],
      );
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
    onSettled: (data, error, variables, context, mutFnCtx) => {
      invalidateTicketUpdateViews(
        queryClient,
        projectId,
        variables.ticketId,
        variables,
      );
      if (variables.type !== undefined) {
        void queryClient.invalidateQueries({
          queryKey: buildWorkQueryKeys.projects.bugs.detail(
            projectId,
            variables.ticketId,
          ),
        });
      }
      options?.onSettled?.(data, error, variables, context, mutFnCtx);
    },
  });
}
