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
  findCachedMessage,
  patchChatMessage,
  type ChatCacheRollback,
} from "@/hooks/api/chat-message-cache";
import {
  appendTimelineMessage,
  removeOptimisticMessage,
  replaceOptimisticMessage,
} from "@/features/chat/message-page-merge";
import {
  cancelChatChannelQueries,
  findChannelRow,
  moveChannelRowToTop,
} from "@/hooks/api/chat-channel-cache";
import { applyOptimisticRead, reconcileUnreadAfterRead } from "@/hooks/api/chat-read-cache";
import {
  beginReaction,
  chatSendRetry,
  enqueueReaction,
  isLatestReaction,
  optimisticMessage,
  reactionKey,
  reconcileSentMessage,
  sendClientKey,
  settleReaction,
} from "@/hooks/api/chat-send-policy";
import type {
  EditMessageInput,
  MessagesPage,
  SendMessageInput,
} from "@/types/chat";
import type { ChatSendResponse } from "@/hooks/api/chat-schema";

const chatOkContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatOkContract),
);

const chatSendResponseContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatSendResponseContract),
);

const chatReactionsContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatReactionsContract),
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
  return useAuthorizedMutation<ChatSendResponse, Error, SendMessageInput, RollbackContext>(
    "chat:messages:write",
    {
      ...chatSendRetry,
      mutationKey: ["chat", "messages", "send"],
      mutationFn: (variables) => {
        const { channelId, ...body } = variables;
        return apiClient.post<ChatSendResponse>(
          `/chat/channels/${channelId}/messages`,
          { ...body, clientKey: sendClientKey(variables) },
          undefined,
          chatSendResponseContract,
        );
      },
      onMutate: async (variables) => {
        const clientKey = sendClientKey(variables);
        const { channelId } = variables;
        await Promise.all([
          cancelChatMessageQueries(queryClient, channelId),
          cancelLoadedQueries(queryClient, [collaborationQueryKeys.chat.myChannels()]),
        ]);
        const optimistic = optimisticMessage({
          ...variables,
          clientKey,
          author: user,
          replyTo:
            variables.replyToId !== undefined
              ? findCachedMessage(queryClient, channelId, variables.replyToId)
              : undefined,
        });
        queryClient.setQueryData<InfiniteData<MessagesPage>>(
          collaborationQueryKeys.chat.messages(channelId),
          (old) => appendTimelineMessage(old, optimistic),
        );
        const undoRow = moveChannelRowToTop(queryClient, channelId, (channel) => ({
          ...channel,
          lastMessage: {
            content: optimistic.content,
            senderName: user?.name ?? null,
            createdAt: optimistic.createdAt,
          },
        }));
        return { rollback: undoRow };
      },
      onError: (_error, variables, context) => {
        queryClient.setQueryData<InfiniteData<MessagesPage>>(
          collaborationQueryKeys.chat.messages(variables.channelId),
          (old) => removeOptimisticMessage(old, sendClientKey(variables)),
        );
        context?.rollback();
      },
      onSuccess: (row, variables) => {
        queryClient.setQueryData<InfiniteData<MessagesPage>>(
          collaborationQueryKeys.chat.messages(variables.channelId),
          (old) =>
            replaceOptimisticMessage(old, sendClientKey(variables), (optimistic) =>
              reconcileSentMessage(optimistic, row),
            ),
        );
        if ((variables.attachments?.length ?? 0) > 0)
          void queryClient.invalidateQueries({
            queryKey: collaborationQueryKeys.chat.channelFiles(variables.channelId),
            exact: true,
            refetchType: "none",
          });
      },
    },
  );
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
      return {
        rollback: patchChatMessage(queryClient, channelId, messageId, { content, isEdited: true }),
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
      return {
        rollback: patchChatMessage(queryClient, channelId, messageId, {
          isDeleted: true,
          content: null,
        }),
      };
    },
    onError: (err, _variables, context) => {
      context?.rollback();
      toast.error(getErrorMessage(err));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.myChannels(),
        exact: true,
        refetchType: "none",
      });
    },
  });
}

export function useMarkChannelRead() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  return useAuthorizedMutation<{ ok: boolean }, Error, { channelId: number }, ReadContext>(
    "chat:messages:read",
    {
      mutationKey: ["chat", "channels", "mark-read"],
      mutationFn: ({ channelId }) =>
        apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/read`, undefined, undefined, chatOkContract),
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
    },
  );
}

type ReactionsResponse = { reactions: Record<string, string[]> };

const reactionRemovals = new WeakMap<object, boolean>();
export function useToggleReaction(channelId: number) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const viewerReacted = (messageId: number, emoji: string) =>
    userId !== undefined &&
    (findCachedMessage(queryClient, channelId, messageId)?.reactions[emoji]?.includes(userId) ?? false);
  return useAuthorizedMutation<ReactionsResponse, Error, { messageId: number; emoji: string }, RollbackContext>(
    "chat:messages:write",
    {
      mutationKey: ["chat", "messages", "toggle-reaction"],
      mutationFn: (variables) => {
        const { messageId, emoji } = variables;
        const remove = reactionRemovals.get(variables) ?? viewerReacted(messageId, emoji);
        return enqueueReaction(reactionKey(channelId, messageId, emoji), () =>
          remove
            ? apiClient.delete<ReactionsResponse>(
                `/chat/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
                undefined,
                undefined,
                chatReactionsContract,
              )
            : apiClient.post<ReactionsResponse>(
                `/chat/channels/${channelId}/messages/${messageId}/reactions`,
                { emoji },
                undefined,
                chatReactionsContract,
              ),
        );
      },
      onMutate: async (variables) => {
        const { messageId, emoji } = variables;
        beginReaction(reactionKey(channelId, messageId, emoji));
        const remove = viewerReacted(messageId, emoji);
        reactionRemovals.set(variables, remove);
        await cancelChatMessageQueries(queryClient, channelId);
        const current = findCachedMessage(queryClient, channelId, messageId);
        if (!current || userId === undefined) return { rollback: () => undefined };
        const users = current.reactions[emoji] ?? [];
        const nextUsers = remove ? users.filter((id) => id !== userId) : [...users, userId];
        const reactions = Object.fromEntries(
          Object.entries({ ...current.reactions, [emoji]: nextUsers }).filter(([, ids]) => ids.length > 0),
        );
        return { rollback: patchChatMessage(queryClient, channelId, messageId, { reactions }) };
      },
      onError: (_error, { messageId, emoji }, context) => {
        if (isLatestReaction(reactionKey(channelId, messageId, emoji))) context?.rollback();
      },
      onSuccess: ({ reactions }, { messageId, emoji }) => {
        if (isLatestReaction(reactionKey(channelId, messageId, emoji)))
          patchChatMessage(queryClient, channelId, messageId, { reactions });
      },
      onSettled: (_data, _error, { messageId, emoji }) => {
        settleReaction(reactionKey(channelId, messageId, emoji));
      },
    },
  );
}
