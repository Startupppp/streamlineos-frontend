"use client";

import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { Message, MessagesPage, SendMessageInput, EditMessageInput } from "@/types/chat";
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

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  return useAuthorizedMutation("chat:messages:write", {
    mutationKey: ["chat", "messages", "send"],
    mutationFn: ({ channelId, ...body }: SendMessageInput) =>
      apiClient.post<ChatSendResponse>(
        `/chat/channels/${channelId}/messages`,
        body,
        undefined,
        chatSendResponseContract,
      ),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: collaborationQueryKeys.chat.messages(variables.channelId),
      });

      const previousData = queryClient.getQueryData<InfiniteData<MessagesPage>>(
        collaborationQueryKeys.chat.messages(variables.channelId),
      );

      const optimisticMsg: Message = {
        id: -Date.now(),
        channelId: variables.channelId,
        senderId: session?.user?.id ?? null,
        content: variables.content ?? null,
        replyToId: variables.replyToId ?? null,
        isEdited: false,
        isDeleted: false,
        messageType: "text",
        metadata: variables.metadata ?? null,
        actionStatus: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sender: {
          id: session?.user?.id ?? null,
          name: session?.user?.name ?? null,
          image: session?.user?.image ?? null,
        },
        attachments: [],
        replyTo: null,
        clientKey: variables.clientKey ?? null,
      };

      if (previousData) {
        const pages = previousData.pages.map((page, i) =>
          i === 0
            ? { ...page, messages: [...page.messages, optimisticMsg] }
            : page,
        );
        queryClient.setQueryData<InfiniteData<MessagesPage>>(
          collaborationQueryKeys.chat.messages(variables.channelId),
          { ...previousData, pages },
        );
      }

      return { previousData };
    },
    onError: (_, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          collaborationQueryKeys.chat.messages(variables.channelId),
          context.previousData,
        );
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.messages(variables.channelId),
      });
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.myChannels() });
      // A send that carried attachments just changed what the Shared Files panel
      // lists. Without this the panel kept its "No files yet" page until a full
      // reload (CHAT-001).
      if (variables.attachments && variables.attachments.length > 0)
        queryClient.invalidateQueries({
          queryKey: collaborationQueryKeys.chat.channelFiles(variables.channelId),
        });
    },
  });
}

export function useEditMessage() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:messages:write", {
    mutationKey: ["chat", "messages", "edit"],
    mutationFn: ({
      channelId,
      messageId,
      content,
    }: EditMessageInput & { channelId: number }) =>
      apiClient.patch<{ ok: boolean }>(
        `/chat/channels/${channelId}/messages/${messageId}`,
        { content },
        undefined,
        chatOkContract,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.all });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:messages:write", {
    mutationKey: ["chat", "messages", "delete"],
    mutationFn: ({
      channelId,
      messageId,
    }: {
      channelId: number;
      messageId: number;
    }) =>
      apiClient.delete<{ ok: boolean }>(
        `/chat/channels/${channelId}/messages/${messageId}`,
        undefined,
        undefined,
        chatOkContract,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.all });
    },
  });
}

export function useMarkChannelRead() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:messages:read", {
    mutationKey: ["chat", "channels", "mark-read"],
    mutationFn: ({ channelId }: { channelId: number }) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/read`, undefined, undefined, chatOkContract),
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.myChannels() });
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.unreadTotal() });
      // The detail read carries this member's `lastReadAt`, which `firstUnreadIndex` reads.
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.channel(channelId) });
    },
  });
}

