"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { TicketLabel, CreateLabelInput } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";


const successLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-schema").then((m) => m.successContract),
);

const attachmentCreateResultLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-schema").then((m) => m.attachmentCreateResultContract),
);

const commentRowLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-schema").then((m) => m.commentRowContract),
);

const ticketRelationListLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-schema").then((m) => m.ticketRelationListContract),
);

const ticketLabelLazy = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.ticketLabelContract),
);

export interface AddCommentInput {
  ticketId: number;
  projectId?: number;
  content: string;
  parentCommentId?: number;
}

export function useAddComment(
  options?: Omit<UseMutationOptions<{ id: number; orgId: string; ticketId: number; body: string; clientVisible: boolean; isEdited: boolean; createdAt: string; updatedAt: string; author: { id: string | null; name: string | null; image: string | null; email: string | null } | null }, Error, AddCommentInput>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; orgId: string; ticketId: number; body: string; clientVisible: boolean; isEdited: boolean; createdAt: string; updatedAt: string; author: { id: string | null; name: string | null; image: string | null; email: string | null } | null }, Error, AddCommentInput>({
    ...options,
    mutationKey: ["projects", "tickets", "comments", "add"],
    mutationFn: ({ ticketId, projectId = 0, content, parentCommentId }) =>
      apiClient.post<{ id: number; orgId: string; ticketId: number; body: string; clientVisible: boolean; isEdited: boolean; createdAt: string; updatedAt: string; author: { id: string | null; name: string | null; image: string | null; email: string | null } | null }>(
        `/build/${projectId}/tickets/${ticketId}/comments`,
        { content, parentCommentId },
        undefined,
        commentRowLazy,
      ),
    onSuccess: (data, variables, context, mutFnCtx) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.ticket(variables.ticketId),
      });
      queryClient.invalidateQueries({
        queryKey: accountingAndSupportQueryKeys.ticketActivity.list(variables.ticketId),
      });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}

export function useAddLabelToTicket(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, { ticketId: number; projectId?: number; labelId: number }>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { ticketId: number; projectId?: number; labelId: number }>({
    ...options,
    mutationKey: ["projects", "tickets", "labels", "add"],
    mutationFn: ({ ticketId, projectId = 0, labelId }) =>
      apiClient.post<{ success: boolean }>(`/build/${projectId}/tickets/${ticketId}/labels`, { labelId }, undefined, successLazy),
    onSuccess: (data, variables, context, mutFnCtx) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.ticket(variables.ticketId),
      });
      if (variables.projectId) {
        queryClient.invalidateQueries({
          queryKey: buildWorkQueryKeys.projects.tickets({ projectId: variables.projectId }),
        });
      }
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}

export function useRemoveLabelFromTicket(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, { ticketId: number; projectId?: number; labelId: number }>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { ticketId: number; projectId?: number; labelId: number }>({
    ...options,
    mutationKey: ["projects", "tickets", "labels", "remove"],
    mutationFn: ({ ticketId, projectId = 0, labelId }) =>
      apiClient.delete<{ success: boolean }>(
        `/build/${projectId}/tickets/${ticketId}/labels/${labelId}`,
        successLazy,
      ),
    onSuccess: (data, variables, context, mutFnCtx) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.ticket(variables.ticketId),
      });
      if (variables.projectId) {
        queryClient.invalidateQueries({
          queryKey: buildWorkQueryKeys.projects.tickets({ projectId: variables.projectId }),
        });
      }
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}

export function useCreateOrgLabel(
  options?: Omit<UseMutationOptions<TicketLabel, Error, CreateLabelInput>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<TicketLabel, Error, CreateLabelInput>("build:manage", {
    ...options,
    mutationKey: ["projects", "labels", "create"],
    mutationFn: (data) =>
      apiClient.post<TicketLabel>("/build/labels", data, undefined, ticketLabelLazy),
    onSuccess: (data, variables, context, mutFnCtx) => {
      queryClient.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.labels() });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}

type AddAttachmentInput = {
  ticketId: number;
  projectId?: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
};

export function useAddAttachment(
  options?: Omit<UseMutationOptions<{ id: number }, Error, AddAttachmentInput>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number }, Error, AddAttachmentInput>({
    ...options,
    mutationKey: ["projects", "tickets", "attachments", "add"],
    mutationFn: ({ ticketId, projectId = 0, fileName, fileUrl, fileSize, mimeType }) =>
      apiClient.post<{ id: number }>(`/build/${projectId}/tickets/${ticketId}/attachments`, {
        fileName,
        fileUrl,
        fileSize,
        mimeType,
      }, undefined, attachmentCreateResultLazy),
    onSuccess: (data, variables, context, mutFnCtx) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.ticket(variables.ticketId),
      });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}

export type WorkItemRelationType = "blocks" | "blocked_by" | "duplicate_of" | "relates_to";

export interface TicketRelationRelatedTicket {
  id: number;
  title: string;
  ticketNumber: number | null;
  status: string | null;
  priority: string | null;
  type: string | null;
  points: number | null;
  assigneeId: string | null;
  projectId: number | null;
  assignee: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    image: string | null;
  } | null;
  project: { key: string | null } | null;
}

export interface TicketRelation {
  id: number;
  relationType: WorkItemRelationType;
  relatedTicket: TicketRelationRelatedTicket | null;
  direction: "outgoing" | "incoming";
}

export function useTicketRelations(ticketId: number, projectId: number) {
  const canView = useCan("build:tickets:view");
  return useQuery({
    queryKey: buildWorkQueryKeys.projects.ticketRelations(ticketId),
    queryFn: ({ signal }) =>
      apiClient.get<TicketRelation[]>(`/build/${projectId}/tickets/${ticketId}/relations`, undefined, signal, ticketRelationListLazy),
    staleTime: 2 * 60_000,
    enabled: canView && !!ticketId && !!projectId,
  });
}

export function useAddTicketRelation(ticketId: number, projectId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:tickets:update", {
    mutationKey: ["projects", "tickets", "relations", "add"],
    mutationFn: (data: { relatedTicketId: number; relationType: WorkItemRelationType }) =>
      apiClient.post<{ id: number }>(`/build/${projectId}/tickets/${ticketId}/relations`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.ticketRelations(ticketId),
      });
    },
  });
}

export function useRemoveTicketRelation(ticketId: number, projectId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:tickets:update", {
    mutationKey: ["projects", "tickets", "relations", "remove"],
    mutationFn: (relatedId: number) =>
      apiClient.delete<{ success: boolean }>(
        `/build/${projectId}/tickets/${ticketId}/relations?relatedId=${relatedId}`,
        successLazy,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.ticketRelations(ticketId),
      });
    },
  });
}
