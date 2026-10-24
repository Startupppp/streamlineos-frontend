"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";
import type { ChatChannelDetailWire } from "@/hooks/api/chat-extra-schema";
import {
  findChannelRow,
  insertChannelRow,
} from "@/hooks/api/chat-channel-cache";
import { channelRowFromDetail } from "@/hooks/api/chat-channel-rows";

const chatLinkPreviewContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatLinkPreviewContract),
);
const chatEntityActionsContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatEntityActionsContract),
);
const chatSubmitActionContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatSubmitActionContract),
);
const chatCreateTaskContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatCreateTaskContract),
);
const chatEntityActionOptionsContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatEntityActionOptionsContract),
);

interface LinkMeta {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

export function useLinkPreview(url: string | null) {
  const canRead = useCan("chat:messages:read");
  const httpUrl = url !== null && url.startsWith("http") ? url : null;
  return useQuery({
    queryKey: [...collaborationQueryKeys.chat.all, "linkPreview", url] as const,
    queryFn: ({ signal }) => {
      if (httpUrl === null) throw new Error("useLinkPreview ran without an http url");
      return apiClient.get<LinkMeta>("/chat/link-preview", { url: httpUrl }, signal, chatLinkPreviewContract);
    },
    enabled: canRead && httpUrl !== null,
    staleTime: 10 * 60_000,
    retry: false,
  });
}

interface CreateTaskFromMessageInput {
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

interface SubmitEntityActionInput {
  channelId: number;
  reference: EntityReferenceInput;
  actionId: string;
  input?: Record<string, unknown>;
}

type EntityActionInputKind = "text" | "date" | "user" | "choice";

export interface EntityActionInputSpec {
  name: string;
  kind: EntityActionInputKind;
  required: boolean;
  choices?: string[];
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

export function useEntityActions(
  channelId: number,
  references: EntityReferenceInput[],
) {
  const referenceKeys = references.map(entityReferenceKey).sort().join(",");
  return useQuery({
    queryKey: collaborationQueryKeys.chat.entityActions(channelId, referenceKeys),
    queryFn: ({ signal }) =>
      apiClient.post<EntityActionsResponse>("/chat/entity-actions/available", {
        channelId,
        references,
      }, { signal }, chatEntityActionsContract),
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
        chatSubmitActionContract,
      );
    },
    onSuccess: (_, variables) => {
      operation.settle();
      queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.messages(variables.channelId),
      });
    },
  });
}

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
        chatCreateTaskContract,
      ),
    onSuccess: (_, variables) => {
      operation.settle();
      queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.messages(variables.channelId),
      });
    },
  });
}

interface EntityOption {
  value: string;
  label: string;
  imageUrl?: string | null;
}

export function useEntityActionOptions(
  channelId: number,
  source: EntityReferenceInput | null | undefined,
) {
  return useQuery({
    queryKey: collaborationQueryKeys.chat.entityActionOptions(
      channelId,
      source ? entityReferenceKey(source) : "",
    ),
    queryFn: ({ signal }) =>
      apiClient.post<{ options: EntityOption[] }>(
        "/chat/entity-actions/options",
        { channelId, reference: source },
        { signal },
        chatEntityActionOptionsContract,
      ),
    enabled: channelId > 0 && Boolean(source),
    staleTime: 60_000,
    select: (data) => data.options,
  });
}

const chatChannelDetailContract = lazyContract(() =>
  import("@/hooks/api/chat-extra-schema").then((m) => m.chatChannelDetailContract),
);

const chatEntityChannelLookupContract = lazyContract(() =>
  import("@/hooks/api/chat-extra-schema").then((m) =>
    m.chatChannelDetailContract.nullable(),
  ),
);

export function useEntityChannel(
  entityType: string | null,
  entityId: string | null,
) {
  const canRead = useCan("chat:channels:read");
  return useQuery({
    ...INLINE_READ_ERROR,
    queryKey: collaborationQueryKeys.chat.entityChannel(entityType, entityId),
    queryFn: ({ signal }) =>
      apiClient.get<ChatChannelDetailWire | null>(`/chat/channels/entity/${entityType}/${entityId}`, undefined, signal, chatEntityChannelLookupContract),
    enabled: canRead && Boolean(entityType && entityId),
    staleTime: 5 * 60_000,
  });
}

interface CreateEntityChannelInput {
  entityType: string;
  entityId: string;
}

export function useCreateEntityChannel() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<ChatChannelDetailWire, Error, CreateEntityChannelInput>(
    "chat:channels:write",
    {
      mutationKey: ["chat", "channels", "entity", "create"],
      mutationFn: ({ entityType, entityId }) =>
        apiClient.post<ChatChannelDetailWire>(
          `/chat/channels/entity/${entityType}/${entityId}`,
          undefined,
          undefined,
          chatChannelDetailContract,
        ),
      onSuccess: (detail, variables) => {
        queryClient.setQueryData<ChatChannelDetailWire | null>(
          collaborationQueryKeys.chat.entityChannel(variables.entityType, variables.entityId),
          detail,
        );
        queryClient.setQueryData<ChatChannelDetailWire>(collaborationQueryKeys.chat.channel(detail.id), detail);
        if (!findChannelRow(queryClient, detail.id))
          insertChannelRow(queryClient, collaborationQueryKeys.chat.myChannels(), channelRowFromDetail(detail));
      },
    },
  );
}
