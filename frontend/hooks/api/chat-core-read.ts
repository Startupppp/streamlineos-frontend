"use client";

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import type { ResponseContract } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { reportError } from "@/lib/observability/error-reporter";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import {
  chatChannelContract,
  chatChannelPageContract,
  chatPublicChannelContract,
} from "@/hooks/api/chat-schema";
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
 * first page truncated the sidebar, the forward dialog and the channel combobox
 * with nothing on screen to say a channel was missing — so the cursor is
 * followed. But following it to exhaustion made every mount pay for the whole
 * channel set, which grows with the tenant.
 *
 * So: a real ceiling. It is not silent — hitting it is reported with the path
 * and the row count, because a cap nobody can see is the truncation this was
 * written to avoid. The screen affordance ("showing the first N, search for
 * more") needs the three consumers in `components/ui/` and `features/chat/`,
 * which this session does not own. A repeated cursor is a server fault, not a
 * page.
 */
export const MAX_CHANNEL_PAGES = 20;

export async function drainChannelPages<TChannel>(
  path: string,
  signal: AbortSignal,
  contract: ResponseContract<ChannelPage<TChannel>>,
): Promise<TChannel[]> {
  const channels: TChannel[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | null = null;
  for (let page = 0; page < MAX_CHANNEL_PAGES; page += 1) {
    const result: ChannelPage<TChannel> = await apiClient.get<ChannelPage<TChannel>>(
      path,
      cursor === null ? undefined : { cursor },
      signal,
      contract,
    );
    channels.push(...result.channels);
    if (result.nextCursor === null || seenCursors.has(result.nextCursor))
      return channels;
    seenCursors.add(result.nextCursor);
    cursor = result.nextCursor;
  }
  reportError(new Error(`Channel drain hit its ${MAX_CHANNEL_PAGES}-page ceiling`), {
    path,
    pages: MAX_CHANNEL_PAGES,
    loaded: channels.length,
  });
  return channels;
}

export function useChatChannels(enabled = true) {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const canRead = useCan("chat:channels:read");
  const chatEnabled = useModuleEnabled("chat");
  return useQuery({
    queryKey: queryKeys.chat.myChannels(),
    queryFn: ({ signal }) =>
      drainChannelPages<Channel>(
        "/chat/channels",
        signal,
        chatChannelPageContract(chatChannelContract),
      ),
    staleTime: 300_000,
    refetchOnWindowFocus: true,
    enabled: !!orgId && enabled && chatEnabled && canRead,
  });
}

export function useArchivedChannels(enabled = true) {
  const canRead = useCan("chat:channels:read");
  return useQuery({
    queryKey: queryKeys.chat.archivedChannels(),
    queryFn: ({ signal }) =>
      drainChannelPages<Channel>(
        "/chat/channels/archived",
        signal,
        chatChannelPageContract(chatChannelContract),
      ),
    staleTime: 2 * 60_000,
    enabled: enabled && canRead,
  });
}

export function usePublicChannels(enabled = true) {
  const canRead = useCan("chat:channels:read");
  return useQuery({
    queryKey: queryKeys.chat.publicChannels(),
    queryFn: ({ signal }) =>
      drainChannelPages<PublicChannel>(
        "/chat/channels/public",
        signal,
        chatChannelPageContract(chatPublicChannelContract),
      ),
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

