"use client";

import {
  useQuery,
  useQueryClient,
  useInfiniteQuery,
  keepPreviousData,
  type InfiniteData,
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { reauthorizeAblyClients } from "@/lib/ably";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useRealtimePollInterval } from "@/hooks/common/use-realtime-poll-interval";
import type {
  Channel,
  ChatNotificationPreference,
  Message,
  MessagesPage,
  OnlineUser,
  OrgUser,
  CreateDMInput,
  CreateGroupChannelInput,
  CreatePublicChannelInput,
  CreatePrivateChannelInput,
  UpdateChannelInput,
  SendMessageInput,
  EditMessageInput,
  AttachmentInput,
  PinnedMessage,
  PublicChannel,
  ThreadPage,
  SearchMessagesResult,
  SearchChannelResult,
  SearchUserResult,
  SavedMessagesPage,
} from "@/types/chat";
import { refreshRealtimeCapability } from "./chat-shared";

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  return useAuthorizedMutation("chat:messages:write", {
    mutationKey: ["chat", "messages", "send"],
    mutationFn: (input: SendMessageInput) =>
      apiClient.post<Message>(
        `/chat/channels/${input.channelId}/messages`,
        input,
      ),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.chat.messages(variables.channelId),
      });

      const previousData = queryClient.getQueryData<InfiniteData<MessagesPage>>(
        queryKeys.chat.messages(variables.channelId),
      );

      const optimisticMsg: Message = {
        id: -Date.now(),
        channelId: variables.channelId,
        senderId: session?.user?.id ?? "__optimistic__",
        content: variables.content ?? null,
        replyToId: variables.replyToId ?? null,
        isEdited: false,
        isDeleted: false,
        messageType: "text",
        metadata: variables.metadata ?? null,
        actionStatus: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sender: session?.user
          ? {
              id: session.user.id,
              name: session.user.name ?? null,
              image: session.user.image ?? null,
            }
          : null,
        attachments: [],
        replyTo: null,
      };

      if (previousData) {
        const pages = previousData.pages.map((page, i) =>
          i === 0
            ? { ...page, messages: [...page.messages, optimisticMsg] }
            : page,
        );
        queryClient.setQueryData<InfiniteData<MessagesPage>>(
          queryKeys.chat.messages(variables.channelId),
          { ...previousData, pages },
        );
      }

      return { previousData };
    },
    onError: (_, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.chat.messages(variables.channelId),
          context.previousData,
        );
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.messages(variables.channelId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
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
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.all });
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
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.all });
    },
  });
}

export function useMarkChannelRead() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:messages:read", {
    mutationKey: ["chat", "channels", "mark-read"],
    mutationFn: ({ channelId }: { channelId: number }) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.unreadTotal() });
    },
  });
}

