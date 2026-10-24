"use client";

import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import {
  cancelChatMessageQueries,
  cancelLoadedQueries,
  patchChatMessage,
  type ChatCacheRollback,
} from "@/hooks/api/chat-message-cache";
import {
  removeOptimisticMessage,
  replaceOptimisticMessage,
} from "@/features/chat/message-page-merge";
import {
  cancelChatChannelQueries,
  findChannelRow,
  moveChannelRowToTop,
  patchLastMessageAfterDelete,
  patchLastMessageIfLatest,
} from "@/hooks/api/chat-channel-cache";
import {
  applyOptimisticRead,
  reconcileUnreadAfterRead,
} from "@/hooks/api/chat-read-cache";
import {
  appendPendingSend,
  awaitSendTurn,
  CHAT_SEND_MUTATION_KEY,
  claimSendTurn,
  chatSendRetry,
  clearTransientSendFailures,
  countTransientSendFailure,
  keepsFailedSendRow,
  pendingSendMessage,
  releaseSendTurn,
} from "@/hooks/api/chat-send-policy";
import type {
  EditMessageInput,
  Message,
  MessagesPage,
  SendMessageInput,
} from "@/types/chat";
import {
  abandonChatSend,
  beginChatSend,
  chatSendVisible,
} from "@/hooks/api/chat-telemetry";

const chatOkContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatOkContract),
);

const chatMessageContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatMessageContract),
);

interface RollbackContext {
  rollback: ChatCacheRollback;
}

interface ReadContext extends RollbackContext {
  rowWasLoaded: boolean;
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user;
  return useAuthorizedMutation<
    Message,
    Error,
    SendMessageInput,
    RollbackContext
  >("chat:messages:write", {
    ...chatSendRetry,
    mutationKey: CHAT_SEND_MUTATION_KEY,
    mutationFn: async (variables) => {
      const { channelId, ...body } = variables;
      await awaitSendTurn(variables.clientKey);
      return apiClient
        .post<Message>(
          `/chat/channels/${channelId}/messages`,
          { ...body, clientKey: variables.clientKey },
          undefined,
          chatMessageContract,
        )
        .catch((error: unknown) => {
          countTransientSendFailure(variables.clientKey, error);
          throw error;
        });
    },
    onMutate: async (variables) => {
      const clientKey = variables.clientKey;
      const { channelId } = variables;
      claimSendTurn(queryClient, channelId, clientKey);
      await Promise.all([
        cancelChatMessageQueries(queryClient, channelId),
        cancelLoadedQueries(queryClient, [
          collaborationQueryKeys.chat.myChannels(),
        ]),
      ]);
      beginChatSend(clientKey);
      const optimistic = pendingSendMessage(
        queryClient,
        user,
        variables,
        clientKey,
      );
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        collaborationQueryKeys.chat.messages(channelId),
        (old) => appendPendingSend(old, optimistic),
      );
      const undoRow = moveChannelRowToTop(
        queryClient,
        channelId,
        (channel) => ({
          ...channel,
          lastMessage: {
            content: optimistic.content,
            senderName: user?.name ?? null,
            createdAt: optimistic.createdAt,
          },
        }),
      );
      return { rollback: undoRow };
    },
    onError: (_error, variables, context) => {
      abandonChatSend(variables.clientKey);
      if (!keepsFailedSendRow(variables.clientKey))
        queryClient.setQueryData<InfiniteData<MessagesPage>>(
          collaborationQueryKeys.chat.messages(variables.channelId),
          (old) => removeOptimisticMessage(old, variables.clientKey),
        );
      context?.rollback();
    },
    onSuccess: (row, variables) => {
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        collaborationQueryKeys.chat.messages(variables.channelId),
        (old) =>
          replaceOptimisticMessage(
            old,
            variables.clientKey,
            () => row,
          ),
      );
      chatSendVisible(variables.clientKey);
      if ((variables.attachments?.length ?? 0) > 0)
        void queryClient.invalidateQueries({
          queryKey: collaborationQueryKeys.chat.channelFiles(
            variables.channelId,
          ),
          exact: true,
          refetchType: "none",
        });
    },
    onSettled: (_data, _error, variables) => {
      clearTransientSendFailures(variables.clientKey);
      releaseSendTurn(variables.clientKey);
    },
  });
}

export function useEditMessage() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    { ok: boolean },
    Error,
    EditMessageInput & { channelId: number },
    RollbackContext
  >("chat:messages:write", {
    mutationKey: ["chat", "messages", "edit"],
    mutationFn: ({ channelId, messageId, content }) =>
      apiClient.patch<{ ok: boolean }>(
        `/chat/channels/${channelId}/messages/${messageId}`,
        { content },
        undefined,
        chatOkContract,
      ),
    onMutate: async ({ channelId, messageId, content }) => {
      await cancelChatMessageQueries(queryClient, channelId);
      const msgRollback = patchChatMessage(queryClient, channelId, messageId, {
        content,
        isEdited: true,
      });
      const previewRollback = patchLastMessageIfLatest(
        queryClient,
        channelId,
        messageId,
        content,
      );
      return {
        rollback: () => {
          msgRollback();
          previewRollback();
        },
      };
    },
    onError: (_error, _variables, context) => context?.rollback(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.myChannels(),
        exact: true,
        refetchType: "none",
      });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    { ok: boolean },
    Error,
    { channelId: number; messageId: number },
    RollbackContext
  >("chat:messages:write", {
    mutationKey: ["chat", "messages", "delete"],
    mutationFn: ({ channelId, messageId }) =>
      apiClient.delete<{ ok: boolean }>(
        `/chat/channels/${channelId}/messages/${messageId}`,
        undefined,
        undefined,
        chatOkContract,
      ),
    onMutate: async ({ channelId, messageId }) => {
      await cancelChatMessageQueries(queryClient, channelId);
      const msgRollback = patchChatMessage(queryClient, channelId, messageId, {
        isDeleted: true,
        content: null,
      });
      const channelRollback = patchLastMessageAfterDelete(
        queryClient,
        channelId,
        messageId,
      );
      return {
        rollback: () => {
          msgRollback();
          channelRollback();
        },
      };
    },
    onError: (err, _variables, context) => {
      context?.rollback();
      toast.error(getErrorMessage(err));
    },
  });
}

export function useMarkChannelRead() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  return useAuthorizedMutation<
    { ok: boolean },
    Error,
    { channelId: number },
    ReadContext
  >("chat:messages:read", {
    mutationKey: ["chat", "channels", "mark-read"],
    mutationFn: ({ channelId }) =>
      apiClient.post<{ ok: boolean }>(
        `/chat/channels/${channelId}/read`,
        undefined,
        undefined,
        chatOkContract,
      ),
    onMutate: async ({ channelId }) => {
      await cancelChatChannelQueries(queryClient, channelId);
      return {
        rowWasLoaded: findChannelRow(queryClient, channelId) !== undefined,
        rollback: applyOptimisticRead(queryClient, channelId, userId),
      };
    },
    onError: (_error, _variables, context) => context?.rollback(),
    onSuccess: (_data, _variables, context) => {
      reconcileUnreadAfterRead(queryClient, context?.rowWasLoaded ?? false);
    },
  });
}
