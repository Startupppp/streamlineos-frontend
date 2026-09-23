"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type {
  Ticket,
  UpdateTicketInput,
  ProjectWithDetails,
  ProjectMember,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";
import {
  invalidateTicketUpdateViews,
  patchTicketCollections,
  restoreTicketCollections,
  rollbackTicketFields,
  ticketRollback,
  type TicketSnapshots,
} from "./ticket-cache";

const ticketUpdateResultLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-subresource-schema").then(
    (m) => m.ticketUpdateResultContract,
  ),
);

export interface UpdateTicketResponse {
  updated: boolean;
  updatedAt: string;
}

interface UpdateTicketContext {
  detailKey: readonly unknown[];
  ticketKey: readonly unknown[];
  previousDetail: ProjectWithDetails | null | undefined;
  previousTicket: Ticket | null | undefined;
  optimisticDetail: ProjectWithDetails | null | undefined;
  optimisticTicket: Ticket | null | undefined;
  listSnapshots: TicketSnapshots;
}

function resolveAssigneeId(
  input: UpdateTicketInput,
): string | null | undefined {
  if (input.assigneeIds !== undefined) return input.assigneeIds[0] ?? null;
  if (input.assigneeId !== undefined) return input.assigneeId;
  return undefined;
}

export function applyTicketPatch(
  ticket: Ticket,
  input: UpdateTicketInput,
  members: ProjectMember[],
): Ticket {
  const next: Ticket = { ...ticket };
  if (input.title !== undefined) next.title = input.title;
  if (input.description !== undefined) next.description = input.description;
  if (input.type !== undefined) next.type = input.type;
  if (input.status !== undefined) next.status = input.status;
  if (input.priority !== undefined) next.priority = input.priority;
  if (input.points !== undefined) next.points = input.points;
  if (input.epicId !== undefined) next.epicId = input.epicId;
  if (input.moduleId !== undefined) next.moduleId = input.moduleId;
  if (input.cycleId !== undefined) next.cycleId = input.cycleId;
  if (input.startDate !== undefined) next.startDate = input.startDate;
  if (input.dueDate !== undefined) next.dueDate = input.dueDate;
  if (input.parentTicketId !== undefined)
    next.parentTicketId = input.parentTicketId;
  const assigneeId = resolveAssigneeId(input);
  if (assigneeId !== undefined) {
    next.assigneeId = assigneeId;
    const member = assigneeId
      ? members.find((m) => m.user?.id === assigneeId)
      : undefined;
    next.assignee = member?.user
      ? {
          id: member.user.id,
          name: member.user.name,
          firstName: member.user.firstName,
          lastName: member.user.lastName,
          email: member.user.email,
          image: member.user.image,
        }
      : null;
  }
  return next;
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
      apiClient.patch<UpdateTicketResponse>(
        `/build/${projectId}/tickets/${ticketId}`,
        data,
        undefined,
        ticketUpdateResultLazy,
      ),
    onMutate: async (variables) => {
      const detailKey = buildWorkQueryKeys.projects.detail(projectId);
      const ticketKey = buildWorkQueryKeys.projects.ticket(variables.ticketId);
      await Promise.all([
        queryClient.cancelQueries({ queryKey: detailKey }),
        queryClient.cancelQueries({ queryKey: ticketKey }),
        queryClient.cancelQueries({
          queryKey: buildWorkQueryKeys.projects.tickets({ projectId }),
        }),
      ]);
      const previousDetail =
        queryClient.getQueryData<ProjectWithDetails | null>(detailKey);
      const previousTicket = queryClient.getQueryData<Ticket | null>(ticketKey);
      const members = previousDetail?.members ?? [];
      const listSnapshots = patchTicketCollections(
        queryClient,
        projectId,
        (ticket) =>
          ticket.id === variables.ticketId
            ? applyTicketPatch(ticket, variables, members)
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
      }
      options?.onError?.(error, variables, context, mutFnCtx);
    },
    onSuccess: (data, variables, context, mutFnCtx) => {
      const applyServerVersion = (ticket: Ticket) =>
        ticket.id === variables.ticketId
          ? { ...ticket, updatedAt: data.updatedAt }
          : ticket;
      patchTicketCollections(queryClient, projectId, applyServerVersion);
      queryClient.setQueryData<Ticket | null>(
        buildWorkQueryKeys.projects.ticket(variables.ticketId),
        (current) => (current ? applyServerVersion(current) : current),
      );
      queryClient.setQueryData<ProjectWithDetails | null>(
        buildWorkQueryKeys.projects.detail(projectId),
        (current) =>
          current?.tickets
            ? { ...current, tickets: current.tickets.map(applyServerVersion) }
            : current,
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
      options?.onSettled?.(data, error, variables, context, mutFnCtx);
    },
  });
}
