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

export function useCreateDMChannel() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "channels", "create-dm"],
    mutationFn: (input: CreateDMInput) =>
      apiClient.post<Channel>("/chat/channels", { type: "DIRECT", ...input }),
    onSuccess: () => {
      refreshRealtimeCapability();
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
    },
  });
}

export function useCreateGroupChannel() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "channels", "create-group"],
    mutationFn: (input: CreateGroupChannelInput) =>
      apiClient.post<Channel>("/chat/channels", { type: "GROUP", ...input }),
    onSuccess: () => {
      refreshRealtimeCapability();
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
    },
  });
}

export function useCreatePublicChannel() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "channels", "create-public"],
    mutationFn: (input: CreatePublicChannelInput) =>
      apiClient.post<Channel>("/chat/channels", { type: "PUBLIC", ...input }),
    onSuccess: () => {
      refreshRealtimeCapability();
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.publicChannels(),
      });
    },
  });
}

export function useCreatePrivateChannel() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "channels", "create-private"],
    mutationFn: (input: CreatePrivateChannelInput) =>
      apiClient.post<Channel>("/chat/channels", { type: "PRIVATE", ...input }),
    onSuccess: () => {
      refreshRealtimeCapability();
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
    },
  });
}

export function useJoinChannel() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "channels", "join"],
    mutationFn: (channelId: number) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/join`),
    onSuccess: () => {
      refreshRealtimeCapability();
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.publicChannels(),
      });
    },
  });
}

export function useLeaveChannel() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "channels", "leave"],
    mutationFn: (channelId: number) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/leave`),
    onSuccess: () => {
      refreshRealtimeCapability();
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.publicChannels(),
      });
    },
  });
}

export function useAddChannelMember() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "channels", "add-member"],
    mutationFn: ({
      channelId,
      userId,
    }: {
      channelId: number;
      userId: string;
    }) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/members`, {
        userId,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.channel(variables.channelId),
      });
    },
  });
}

export function useRemoveChannelMember() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "channels", "remove-member"],
    mutationFn: ({
      channelId,
      userId,
    }: {
      channelId: number;
      userId: string;
    }) =>
      apiClient.delete<{ ok: boolean }>(
        `/chat/channels/${channelId}/members/${userId}`,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.channel(variables.channelId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
    },
  });
}

export function useUpdateChannel() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "channels", "update"],
    mutationFn: ({
      channelId,
      ...update
    }: UpdateChannelInput & { channelId: number }) =>
      apiClient.patch<{ ok: boolean }>(`/chat/channels/${channelId}`, update),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.channel(variables.channelId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
    },
  });
}

export function useChatHeartbeat() {
  return useAuthorizedMutation("chat:messages:write", {
    mutationKey: ["chat", "presence", "heartbeat"],
    mutationFn: () =>
      apiClient.post<{ ok: boolean }>("/chat/presence/heartbeat"),
  });
}

export function useToggleReaction(channelId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:messages:write", {
    mutationKey: ["chat", "messages", "toggle-reaction"],
    mutationFn: ({ messageId, emoji }: { messageId: number; emoji: string }) =>
      apiClient.post<{ reactions: Record<string, string[]> }>(
        `/chat/channels/${channelId}/messages/${messageId}/reactions`,
        { emoji },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.messages(channelId),
      });
    },
  });
}
