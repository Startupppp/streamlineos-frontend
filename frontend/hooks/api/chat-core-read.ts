"use client";

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import type {
  Channel,
  Message,
  MessagesPage,
  OnlineUser,
  OrgUser,
  PublicChannel,
} from "@/types/chat";

interface ChannelPage<TChannel> {
  channels: TChannel[];
  nextCursor: string | null;
}

/**
 * The route answers one keyset page of 50 and a `nextCursor`. Reading only the
 * first page truncates the sidebar, the forward dialog and the channel
 * combobox with nothing on screen to say a channel is missing, so the cursor is
 * followed to exhaustion. A repeated cursor is a server fault, not a page.
 */
export async function drainChannelPages<TChannel>(
  path: string,
  signal: AbortSignal,
): Promise<TChannel[]> {
  const channels: TChannel[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | null = null;
  for (;;) {
    const page: ChannelPage<TChannel> = await apiClient.get<ChannelPage<TChannel>>(
      path,
      cursor === null ? undefined : { cursor },
      signal,
    );
    channels.push(...page.channels);
    if (page.nextCursor === null || seenCursors.has(page.nextCursor)) return channels;
    seenCursors.add(page.nextCursor);
    cursor = page.nextCursor;
  }
}

export function useChatChannels(enabled = true) {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const canRead = useCan("chat:channels:read");
  const chatEnabled = useModuleEnabled("chat");
  return useQuery({
    queryKey: queryKeys.chat.myChannels(),
    queryFn: ({ signal }) => drainChannelPages<Channel>("/chat/channels", signal),
    staleTime: 300_000,
    refetchOnWindowFocus: true,
    enabled: !!orgId && enabled && chatEnabled && canRead,
  });
}

export function useArchivedChannels(enabled = true) {
  const canRead = useCan("chat:channels:read");
  return useQuery({
    queryKey: queryKeys.chat.archivedChannels(),
    queryFn: ({ signal }) => drainChannelPages<Channel>("/chat/channels/archived", signal),
    staleTime: 2 * 60_000,
    enabled: enabled && canRead,
  });
}

export function usePublicChannels(enabled = true) {
  const canRead = useCan("chat:channels:read");
  return useQuery({
    queryKey: queryKeys.chat.publicChannels(),
    queryFn: ({ signal }) =>
      drainChannelPages<PublicChannel>("/chat/channels/public", signal),
    staleTime: 2 * 60_000,
    enabled: enabled && canRead,
  });
}

export function useChatChannel(channelId: number) {
  const canRead = useCan("chat:channels:read");
  return useQuery({
    queryKey: queryKeys.chat.channel(channelId),
    queryFn: ({ signal }) => apiClient.get<Channel>(`/chat/channels/${channelId}`, undefined, signal),
    staleTime: 2 * 60_000,
    enabled: canRead && channelId > 0,
  });
}

export function useChatMessages(channelId: number) {
  const canRead = useCan("chat:messages:read");
  return useInfiniteQuery({
    queryKey: queryKeys.chat.messages(channelId),
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<MessagesPage>(
        `/chat/channels/${channelId}/messages`,
        pageParam ? { cursor: pageParam } : undefined, signal,
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as number | undefined,
    enabled: canRead && channelId > 0,
  });
}

export type PollPage = {
  messages: Message[];
  nextCursor: number | null;
  hasMore: boolean;
};

const CHAT_POLL_FALLBACK_INTERVAL_MS = 30_000;

/** `enabled` is the caller's realtime verdict: it polls only while the socket is down. */
export function useChatPoll(
  channelId: number,
  since: string,
  enabled: boolean,
) {
  const canRead = useCan("chat:messages:read");
  return useQuery({
    queryKey: queryKeys.chat.poll(channelId, since),
    queryFn: ({ signal }) =>
      apiClient.get<PollPage>(`/chat/channels/${channelId}/messages/poll`, {
        since,
      }, signal),
    staleTime: 2 * 60_000,
    enabled: enabled && canRead && channelId > 0,
    refetchInterval: enabled && canRead ? CHAT_POLL_FALLBACK_INTERVAL_MS : false,
  });
}

export function useChatUnreadTotal(enabled = true) {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const canRead = useCan("chat:messages:read");
  const chatEnabled = useModuleEnabled("chat");
  return useQuery({
    queryKey: queryKeys.chat.unreadTotal(),
    queryFn: ({ signal }) => apiClient.get<{ total: number }>("/chat/unread", undefined, signal),
    staleTime: 300_000,
    refetchOnWindowFocus: true,
    enabled: !!orgId && enabled && chatEnabled && canRead,
  });
}

export function useChatOnlineUsers(enabled = true) {
  const canRead = useCan("chat:messages:read");
  return useQuery({
    queryKey: queryKeys.chat.onlineUsers(),
    queryFn: ({ signal }) => apiClient.get<OnlineUser[]>("/chat/presence/online", undefined, signal),
    refetchInterval: 60_000,
    staleTime: 65_000,
    enabled: enabled && canRead,
  });
}

export function useChatOrgUsers(enabled = true) {
  const canRead = useCan("chat:channels:read");
  return useQuery({
    queryKey: queryKeys.chat.orgUsers(),
    queryFn: ({ signal }) => apiClient.get<OrgUser[]>("/chat/users", undefined, signal),
    staleTime: 2 * 60_000,
    enabled: enabled && canRead,
  });
}

