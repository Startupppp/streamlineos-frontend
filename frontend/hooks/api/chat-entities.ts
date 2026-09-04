"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";

interface LinkMeta {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

export function useLinkPreview(url: string | null) {
  const canRead = useCan("chat:messages:read");
  return useQuery({
    queryKey: [...queryKeys.chat.all, "linkPreview", url] as const,
    queryFn: ({ signal }) => apiClient.get<LinkMeta>("/chat/link-preview", { url: url! }, signal),
    enabled: canRead && Boolean(url) && url!.startsWith("http"),
    staleTime: 10 * 60_000,
    retry: false,
  });
}

export interface CreateTaskFromMessageInput {
  channelId: number;
  messageId: number;
  projectId: number;
  type: "TASK" | "BUG";
  title?: string;
}

export interface EntityReferenceInput {
  type: string;
  id: string;
}

export interface SubmitEntityActionInput {
  channelId: number;
  reference: EntityReferenceInput;
  actionId: string;
  input?: Record<string, unknown>;
}

export type EntityActionInputKind = "text" | "date" | "user" | "choice";

export interface EntityActionInputSpec {
  name: string;
  kind: EntityActionInputKind;
  required: boolean;
  choices?: string[];
  /** Where the valid answers come from, when they are not a literal list. */
  options?: { from: EntityReferenceInput };
}

export interface EntityAction {
  id: string;
  label: string;
  inputs: EntityActionInputSpec[];
}

interface EntityActionsResponse {
  references: { reference: EntityReferenceInput; actions: EntityAction[] }[];
}

export function entityReferenceKey(reference: EntityReferenceInput): string {
  return `${reference.type}:${reference.id}`;
}

// One batched ask per visible set of references; per bubble would be a request per record.
export function useEntityActions(
  channelId: number,
  references: EntityReferenceInput[],
) {
  const referenceKeys = references.map(entityReferenceKey).sort().join(",");
  return useQuery({
    queryKey: queryKeys.chat.entityActions(channelId, referenceKeys),
    queryFn: ({ signal }) =>
      apiClient.post<EntityActionsResponse>("/chat/entity-actions/available", {
        channelId,
        references,
      }, { signal }),
    enabled: channelId > 0 && references.length > 0,
    staleTime: 30_000,
    select: (data) => {
      const byReference = new Map<string, EntityAction[]>();
      for (const entry of data.references)
        byReference.set(entityReferenceKey(entry.reference), entry.actions);
      return byReference;
    },
  });
}

/**
 * One route for every action on every referenced record. The action's identity
 * travels in the body, so adding one is an adapter change on the server rather
 * than a new endpoint, a new hook and a new dialog here.
 */
export function useSubmitEntityAction() {
  const queryClient = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("chat:messages:write", {
    mutationKey: ["chat", "entity-actions", "submit"],
    mutationFn: (variables: SubmitEntityActionInput) => {
      const body = {
        channelId: variables.channelId,
        reference: variables.reference,
        actionId: variables.actionId,
        input: variables.input ?? {},
      };
      return apiClient.post<Record<string, unknown>>(
        "/chat/entity-actions/submit",
        body,
        operation.configFor(body),
      );
    },
    onSuccess: (_, variables) => {
      operation.settle();
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.messages(variables.channelId),
      });
    },
  });
}

/**
 * Stays chat-specific on purpose: the server reads the message's own text to
 * fill the new record's description, which the generic entity-action route
 * cannot do without knowing what a chat message is.
 *
 * Both action routes are `@Idempotent` on the backend and the interceptor
 * REJECTS a request without an `Idempotency-Key` header with a 400 before the
 * handler runs, so the header is part of the contract, not an optimisation.
 * `/chat/entity-actions/submit` has carried `@Idempotent("chat.action.submit")`
 * while this file sent no header, which 400s every entity action the UI submits.
 * `useIdempotentOperation` holds one key for the life of a retried attempt, so a
 * Retry after a timeout replays the first result instead of filing a second
 * ticket, and releases it on success so the next click is a new operation.
 */
export function useCreateTaskFromMessage() {
  const queryClient = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("chat:messages:write", {
    mutationKey: ["chat", "actions", "create-task-from-message"],
    mutationFn: (input: CreateTaskFromMessageInput) =>
      apiClient.post<{ ticketId: number; ticketNumber: number }>(
        "/chat/actions/create-task-from-message",
        input,
        operation.configFor(input),
      ),
    onSuccess: (_, variables) => {
      operation.settle();
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.messages(variables.channelId),
      });
    },
  });
}

export interface EntityOption {
  value: string;
  label: string;
  imageUrl?: string | null;
}

/**
 * Resolves an input's declared option source to its candidates. The caller
 * passes the reference the declaration named and never has to know which module
 * produced it — which is the whole point of the source being declared.
 */
export function useEntityActionOptions(
  channelId: number,
  source: EntityReferenceInput | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.chat.entityActionOptions(
      channelId,
      source ? entityReferenceKey(source) : "",
    ),
    queryFn: ({ signal }) =>
      apiClient.post<{ options: EntityOption[] }>(
        "/chat/entity-actions/options",
        { channelId, reference: source },
        { signal },
      ),
    enabled: channelId > 0 && Boolean(source),
    staleTime: 60_000,
    select: (data) => data.options,
  });
}

