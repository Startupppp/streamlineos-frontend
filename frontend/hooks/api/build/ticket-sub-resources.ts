"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { Ticket, TicketComment, TicketLabel, CreateLabelInput } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { lazyContract } from "@/lib/api-envelope";
import type { z } from "zod";
import type { ticketRelationListContract as ticketRelationListContractDef } from "@/hooks/api/build/build-tickets-subresource-schema";


const successLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-subresource-schema").then((m) => m.successContract),
);
const noContentLazy = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

const attachmentCreateResultLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-subresource-schema").then((m) => m.attachmentCreateResultContract),
);

const commentRowLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-subresource-schema").then((m) => m.commentRowContract),
);

const ticketRelationListLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-subresource-schema").then((m) => m.ticketRelationListContract),
);

const ticketLabelLazy = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.ticketLabelContract),
);

interface CommentCreateResponse {
  id: number;
  orgId: string;
  ticketId: number;
  body: string;
  clientVisible: boolean;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  author: { id: string | null; name: string | null; image: string | null; email: string | null } | null;
}

interface OptimisticAuthor {
  id: string;
  name: string | null;
  image: string | null;
}

interface AddCommentContext {
  tempId: number;
  ticketKey: readonly unknown[];
  previousComments: TicketComment[];
}

export interface AddCommentInput {
  ticketId: number;
  projectId: number;
  content: string;
  parentCommentId?: number;
  optimisticAuthor?: OptimisticAuthor;
}

export function useAddComment(
  options?: Omit<UseMutationOptions<CommentCreateResponse, Error, AddCommentInput, AddCommentContext>, "mutationFn" | "mutationKey" | "onMutate">
) {
  const queryClient = useQueryClient();
  return useMutation<CommentCreateResponse, Error, AddCommentInput, AddCommentContext>({
    ...options,
    mutationKey: ["projects", "tickets", "comments", "add"],
    mutationFn: ({ ticketId, projectId, content, parentCommentId }) =>
      apiClient.post<CommentCreateResponse>(
        `/build/${projectId}/tickets/${ticketId}/comments`,
        { content, parentCommentId },
        undefined,
        commentRowLazy,
      ),
    onMutate: async (variables) => {
      const tempId = -Date.now();
      const ticketKey = buildWorkQueryKeys.projects.ticket(variables.ticketId);
      await queryClient.cancelQueries({ queryKey: ticketKey });
      const ticket = queryClient.getQueryData<Ticket | null>(ticketKey);
      const previousComments = ticket?.comments ?? [];
      const tempComment: TicketComment = {
        id: tempId,
        orgId: "",
        ticketId: variables.ticketId,
        userId: variables.optimisticAuthor?.id ?? "",
        content: variables.content,
        parentCommentId: variables.parentCommentId ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user: variables.optimisticAuthor
          ? {
              id: variables.optimisticAuthor.id,
              name: variables.optimisticAuthor.name,
              firstName: null,
              lastName: null,
              email: null,
              image: variables.optimisticAuthor.image,
            }
          : undefined,
      };
      queryClient.setQueryData<Ticket | null>(ticketKey, (current) => {
        if (!current) return current;
        return { ...current, comments: [...(current.comments ?? []), tempComment] };
      });
      return { tempId, ticketKey, previousComments };
    },
    onSuccess: (data, variables, context, mutFnCtx) => {
      if (context) {
        const realComment: TicketComment = {
          id: data.id,
          orgId: data.orgId,
          ticketId: data.ticketId,
          userId: data.author?.id ?? "",
          content: data.body,
          parentCommentId: variables.parentCommentId ?? null,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          user: data.author
            ? {
                id: data.author.id ?? "",
                name: data.author.name,
                firstName: null,
                lastName: null,
                email: data.author.email,
                image: data.author.image,
              }
            : undefined,
        };
        queryClient.setQueryData<Ticket | null>(context.ticketKey, (current) => {
          if (!current?.comments) return current;
          return {
            ...current,
            comments: current.comments.map((c) => (c.id === context.tempId ? realComment : c)),
          };
        });
      }
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
    onError: (error, variables, context, mutFnCtx) => {
      if (context) {
        queryClient.setQueryData<Ticket | null>(context.ticketKey, (current) => {
          if (!current) return current;
          return {
            ...current,
            comments: current.comments?.filter((c) => c.id !== context.tempId) ?? context.previousComments,
          };
        });
      }
      options?.onError?.(error, variables, context, mutFnCtx);
    },
    onSettled: (data, error, variables, context, mutFnCtx) => {
      if (error)
        queryClient.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.ticket(variables.ticketId) });
      queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.ticketActivity.list(variables.ticketId) });
      options?.onSettled?.(data, error, variables, context, mutFnCtx);
    },
  });
}

export function useAddLabelToTicket(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, { ticketId: number; projectId: number; labelId: number }>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { ticketId: number; projectId: number; labelId: number }>({
    ...options,
    mutationKey: ["projects", "tickets", "labels", "add"],
    mutationFn: ({ ticketId, projectId, labelId }) =>
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
  options?: Omit<UseMutationOptions<void, Error, { ticketId: number; projectId: number; labelId: number }>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { ticketId: number; projectId: number; labelId: number }>({
    ...options,
    mutationKey: ["projects", "tickets", "labels", "remove"],
    mutationFn: ({ ticketId, projectId, labelId }) =>
      apiClient.delete<void>(
        `/build/${projectId}/tickets/${ticketId}/labels/${labelId}`,
        undefined,
        undefined,
        noContentLazy,
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
  projectId: number;
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
    mutationFn: ({ ticketId, projectId, fileName, fileUrl, fileSize, mimeType }) =>
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

export type TicketRelation = z.infer<typeof ticketRelationListContractDef>[number];
export type TicketRelationRelatedTicket = NonNullable<TicketRelation["relatedTicket"]>;
export type WorkItemRelationType = TicketRelation["relationType"];

export function useTicketRelations(ticketId: number, projectId: number) {
  const canView = useCan("build:tickets:view");
  return useQuery({
    ...INLINE_READ_ERROR,
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
      apiClient.post<{ id: number }>(`/build/${projectId}/tickets/${ticketId}/relations`, data, undefined, attachmentCreateResultLazy),
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
    },
  });
}
