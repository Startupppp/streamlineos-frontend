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


export function useChatChannels(enabled = true) {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const canRead = useCan("chat:channels:read");
  const chatEnabled = useModuleEnabled("chat");
  return useQuery({
    queryKey: queryKeys.chat.myChannels(orgId),
    queryFn: () => apiClient.get<Channel[]>("/chat/channels"),
    staleTime: 300_000,
    refetchOnWindowFocus: true,
    enabled: !!orgId && enabled && chatEnabled && canRead,
  });
}

export function useArchivedChannels(enabled = true) {
  const canRead = useCan("chat:channels:read");
  return useQuery({
    queryKey: queryKeys.chat.archivedChannels(),
    queryFn: () => apiClient.get<Channel[]>("/chat/channels/archived"),
    staleTime: 2 * 60_000,
    enabled: enabled && canRead,
  });
}

export function usePublicChannels(enabled = true) {
  const canRead = useCan("chat:channels:read");
  return useQuery({
    queryKey: queryKeys.chat.publicChannels(),
    queryFn: () => apiClient.get<PublicChannel[]>("/chat/channels/public"),
    staleTime: 2 * 60_000,
    enabled: enabled && canRead,
  });
}

export function useChatChannel(channelId: number) {
  const canRead = useCan("chat:channels:read");
  return useQuery({
    queryKey: queryKeys.chat.channel(channelId),
    queryFn: () => apiClient.get<Channel>(`/chat/channels/${channelId}`),
    staleTime: 2 * 60_000,
    enabled: canRead && channelId > 0,
  });
}

export function useChatMessages(channelId: number) {
  const canRead = useCan("chat:messages:read");
  return useInfiniteQuery({
    queryKey: queryKeys.chat.messages(channelId),
    queryFn: ({ pageParam }) =>
      apiClient.get<MessagesPage>(
        `/chat/channels/${channelId}/messages`,
        pageParam ? { cursor: pageParam } : undefined,
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as number | undefined,
    enabled: canRead && channelId > 0,
  });
}

export function useChatPoll(
  channelId: number,
  since: string,
  enabled: boolean,
) {
  const canRead = useCan("chat:messages:read");
  const pollInterval = useRealtimePollInterval(30_000);
  return useQuery({
    queryKey: queryKeys.chat.poll(channelId, since),
    queryFn: () =>
      apiClient.get<Message[]>(`/chat/channels/${channelId}/messages/poll`, {
        since,
      }),
    staleTime: 2 * 60_000,
    enabled: enabled && canRead && channelId > 0,
    refetchInterval: enabled && canRead ? pollInterval : false,
  });
}

export function useChatUnreadTotal(enabled = true) {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const canRead = useCan("chat:messages:read");
  const chatEnabled = useModuleEnabled("chat");
  return useQuery({
    queryKey: queryKeys.chat.unreadTotal(orgId),
    queryFn: () => apiClient.get<{ total: number }>("/chat/unread"),
    staleTime: 300_000,
    refetchOnWindowFocus: true,
    enabled: !!orgId && enabled && chatEnabled && canRead,
  });
}

export function useChatOnlineUsers(enabled = true) {
  const canRead = useCan("chat:messages:read");
  return useQuery({
    queryKey: queryKeys.chat.onlineUsers(),
    queryFn: () => apiClient.get<OnlineUser[]>("/chat/presence/online"),
    refetchInterval: 60_000,
    staleTime: 65_000,
    enabled: enabled && canRead,
  });
}

export function useChatOrgUsers(enabled = true) {
  const canRead = useCan("chat:channels:read");
  return useQuery({
    queryKey: queryKeys.chat.orgUsers(),
    queryFn: () => apiClient.get<OrgUser[]>("/chat/users"),
    staleTime: 2 * 60_000,
    enabled: enabled && canRead,
  });
}

