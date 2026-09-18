"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  CreateDMInput,
  CreateGroupChannelInput,
  CreatePublicChannelInput,
  CreatePrivateChannelInput,
  UpdateChannelInput,
} from "@/types/chat";
import type { ChatChannelDetailWire } from "@/hooks/api/chat-extra-schema";
import type { PresenceClearAfter, PresenceStatus } from "@/lib/presence";
import { refreshRealtimeCapability } from "./chat-shared";

const chatOkContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatOkContract),
);

const chatChannelDetailContract = lazyContract(() =>
  import("@/hooks/api/chat-extra-schema").then((m) => m.chatChannelDetailContract),
);

const chatReactionsContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatReactionsContract),
);

export function useCreateDMChannel() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "channels", "create-dm"],
    mutationFn: (input: CreateDMInput) =>
      apiClient.post<ChatChannelDetailWire>("/chat/channels", { type: "DIRECT", ...input }, undefined, chatChannelDetailContract),
    onSuccess: () => {
      refreshRealtimeCapability();
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.myChannels() });
    },
  });
}

export function useCreateGroupChannel() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "channels", "create-group"],
    mutationFn: (input: CreateGroupChannelInput) =>
      apiClient.post<ChatChannelDetailWire>("/chat/channels", { type: "GROUP", ...input }, undefined, chatChannelDetailContract),
    onSuccess: () => {
      refreshRealtimeCapability();
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.myChannels() });
    },
  });
}

export function useCreatePublicChannel() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "channels", "create-public"],
    mutationFn: (input: CreatePublicChannelInput) =>
      apiClient.post<ChatChannelDetailWire>("/chat/channels", { type: "PUBLIC", ...input }, undefined, chatChannelDetailContract),
    onSuccess: () => {
      refreshRealtimeCapability();
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.myChannels() });
      queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.publicChannels(),
      });
    },
  });
}

export function useCreatePrivateChannel() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "channels", "create-private"],
    mutationFn: (input: CreatePrivateChannelInput) =>
      apiClient.post<ChatChannelDetailWire>("/chat/channels", { type: "PRIVATE", ...input }, undefined, chatChannelDetailContract),
    onSuccess: () => {
      refreshRealtimeCapability();
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.myChannels() });
    },
  });
}

export function useJoinChannel() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "channels", "join"],
    mutationFn: (channelId: number) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/join`, undefined, undefined, chatOkContract),
    onSuccess: () => {
      refreshRealtimeCapability();
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.myChannels() });
      queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.publicChannels(),
      });
    },
  });
}

export function useLeaveChannel() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "channels", "leave"],
    mutationFn: (channelId: number) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/leave`, undefined, undefined, chatOkContract),
    onSuccess: () => {
      refreshRealtimeCapability();
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.myChannels() });
      queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.publicChannels(),
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
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/members`, { userId }, undefined, chatOkContract),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.channel(variables.channelId),
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
        undefined,
        undefined,
        chatOkContract,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.channel(variables.channelId),
      });
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.myChannels() });
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
      apiClient.patch<{ ok: boolean }>(`/chat/channels/${channelId}`, update, undefined, chatOkContract),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.channel(variables.channelId),
      });
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.myChannels() });
    },
  });
}

export function useChatHeartbeat() {
  return useAuthorizedMutation("chat:messages:read", {
    mutationKey: ["chat", "presence", "heartbeat"],
    mutationFn: () =>
      apiClient.post<{ ok: boolean }>("/chat/presence/heartbeat", undefined, undefined, chatOkContract),
  });
}

export interface SetPresenceStatusInput {
  status: PresenceStatus;
  statusMessage?: string;
  clearAfter?: PresenceClearAfter;
}

export function useSetPresenceStatus() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:messages:write", {
    mutationKey: ["chat", "presence", "set-status"],
    mutationFn: (input: SetPresenceStatusInput) =>
      apiClient.put<{ ok: boolean }>("/chat/status", input, undefined, chatOkContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.onlineUsers() });
    },
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
        undefined,
        chatReactionsContract,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.messages(channelId),
      });
    },
  });
}
