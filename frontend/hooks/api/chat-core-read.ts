"use client";

import { useCallback, useMemo } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract, type ContractSource } from "@/lib/api-envelope";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { reportError } from "@/lib/observability/error-reporter";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { isPresenceStatus, type PresenceStatus } from "@/lib/presence";
import type {
  Channel,
  ChannelPage,
  Message,
  MessagesPage,
  OnlineUser,
  OrgUser,
  PublicChannel,
} from "@/types/chat";
import type { ChatChannelDetailWire } from "@/hooks/api/chat-extra-schema";
import { NO_ID_CURSOR_YET } from "@/hooks/api/cursor-page-param";

export interface ChannelListResult<TChannel> {
  channels: TChannel[];
  hasMore: boolean;
  isTruncated: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  fetchStatus: "fetching" | "paused" | "idle";
  isError: boolean;
  error: Error | null;
  loadMore: () => void;
  refetch: () => void;
}


const myChannelsContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) =>
    m.chatChannelPageContract(m.chatChannelContract),
  ),
);

const publicChannelsContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) =>
    m.chatChannelPageContract(m.chatPublicChannelContract),
  ),
);

const messagesPageContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatMessagesPageContract),
);

const pollPageContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatPollPageContract),
);

const channelDetailContract = lazyContract(() =>
  import("@/hooks/api/chat-extra-schema").then((m) => m.chatChannelDetailContract),
);

const chatUnreadContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatUnreadContract),
);

const chatOnlineUsersContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatOnlineUsersContract),
);

const chatOrgUsersContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatOrgUsersContract),
);

export const MAX_CHANNEL_PAGES = 20;

export async function fetchChannelPage<TChannel>(
  path: string,
  signal: AbortSignal,
  contract: ContractSource<ChannelPage<TChannel>>,
  cursor?: string,
): Promise<ChannelPage<TChannel>> {
  const page: ChannelPage<TChannel> = await apiClient.get<ChannelPage<TChannel>>(
    path,
    cursor === undefined ? undefined : { cursor },
    signal,
    contract,
  );
  if (page.nextCursor !== null && page.nextCursor === cursor) {
    reportError(new Error("Channel page repeated the cursor it was given"), {
      path,
      cursor,
      loaded: page.channels.length,
    });
    return { channels: page.channels, nextCursor: null };
  }
  return page;
}

interface ChannelPagesOptions<TChannel> {
  queryKey: readonly unknown[];
  fetchPage: (
    signal: AbortSignal,
    cursor: string | undefined,
  ) => Promise<ChannelPage<TChannel>>;
  staleTime: number;
  enabled: boolean;
  refetchOnWindowFocus?: boolean;
}

function useChannelPages<TChannel>({
  queryKey,
  fetchPage,
  staleTime,
  enabled,
  refetchOnWindowFocus = false,
}: ChannelPagesOptions<TChannel>): ChannelListResult<TChannel> {
  const query = useInfiniteQuery({
    ...INLINE_READ_ERROR,
    queryKey,
    queryFn: ({ pageParam, signal }) =>
      fetchPage(signal, pageParam === null ? undefined : pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: ChannelPage<TChannel>, allPages) =>
      allPages.length >= MAX_CHANNEL_PAGES ? undefined : lastPage.nextCursor,
    staleTime,
    refetchOnWindowFocus,
    enabled,
  });

  const pages = query.data?.pages;
  const channels = useMemo(
    () => (pages === undefined ? [] : pages.flatMap((p) => p.channels)),
    [pages],
  );

  const { hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = query;

  const loadMore = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRefetch = useCallback(() => {
    void refetch();
  }, [refetch]);

  return {
    channels,
    hasMore: hasNextPage,
    isTruncated:
      !hasNextPage &&
      (pages?.length ?? 0) >= MAX_CHANNEL_PAGES &&
      (pages?.at(-1)?.nextCursor ?? null) !== null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage,
    fetchStatus: query.fetchStatus,
    isError: query.isError,
    error: query.error,
    loadMore,
    refetch: handleRefetch,
  };
}

export function useChatChannels(enabled = true): ChannelListResult<Channel> {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const canRead = useCan("chat:channels:read");
  const chatEnabled = useModuleEnabled("chat");
  return useChannelPages<Channel>({
    queryKey: collaborationQueryKeys.chat.myChannels(),
    fetchPage: (signal, cursor) =>
      fetchChannelPage<Channel>("/chat/channels", signal, myChannelsContract, cursor),
    staleTime: 300_000,
    refetchOnWindowFocus: true,
    enabled: !!orgId && enabled && chatEnabled && canRead,
  });
}

export function useArchivedChannels(enabled = true): ChannelListResult<Channel> {
  const canRead = useCan("chat:channels:read");
  return useChannelPages<Channel>({
    queryKey: collaborationQueryKeys.chat.archivedChannels(),
    fetchPage: (signal, cursor) =>
      fetchChannelPage<Channel>("/chat/channels/archived", signal, myChannelsContract, cursor),
    staleTime: 2 * 60_000,
    enabled: enabled && canRead,
  });
}

export function usePublicChannels(enabled = true): ChannelListResult<PublicChannel> {
  const canRead = useCan("chat:channels:read");
  return useChannelPages<PublicChannel>({
    queryKey: collaborationQueryKeys.chat.publicChannels(),
    fetchPage: (signal, cursor) =>
      fetchChannelPage<PublicChannel>("/chat/channels/public", signal, publicChannelsContract, cursor),
    staleTime: 2 * 60_000,
    enabled: enabled && canRead,
  });
}

export function useChatChannel(channelId: number) {
  const canRead = useCan("chat:channels:read");
  return useQuery({
    queryKey: collaborationQueryKeys.chat.channel(channelId),
    queryFn: ({ signal }) => apiClient.get<ChatChannelDetailWire>(`/chat/channels/${channelId}`, undefined, signal, channelDetailContract),
    staleTime: 2 * 60_000,
    enabled: canRead && channelId > 0,
  });
}

export function useChatMessages(channelId: number) {
  const canRead = useCan("chat:messages:read");
  return useInfiniteQuery({
    ...INLINE_READ_ERROR,
    queryKey: collaborationQueryKeys.chat.messages(channelId),
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<MessagesPage>(
        `/chat/channels/${channelId}/messages`,
        pageParam !== undefined ? { cursor: pageParam } : undefined,
        signal,
        messagesPageContract,
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: NO_ID_CURSOR_YET,
    enabled: canRead && channelId > 0,
  });
}

export type PollPage = {
  messages: Message[];
  nextCursor: number | null;
  hasMore: boolean;
  latestPosition: number | null;
};

export type ChatPollPosition =
  | { kind: "since"; since: string }
  | { kind: "cursor"; cursor: number };

export function chatPollPositionKey(position: ChatPollPosition): string {
  return position.kind === "since"
    ? `since:${position.since}`
    : `cursor:${position.cursor}`;
}

const CHAT_POLL_FALLBACK_INTERVAL_MS = 30_000;

/** `enabled` is the caller's realtime verdict: it polls only while the socket is down. */
export function useChatPoll(
  channelId: number,
  position: ChatPollPosition,
  enabled: boolean,
) {
  const canRead = useCan("chat:messages:read");
  return useQuery({
    queryKey: collaborationQueryKeys.chat.poll(
      channelId,
      chatPollPositionKey(position),
    ),
    queryFn: ({ signal }) =>
      apiClient.get<PollPage>(
        `/chat/channels/${channelId}/messages/poll`,
        position.kind === "since"
          ? { since: position.since }
          : { cursor: position.cursor },
        signal,
        pollPageContract,
      ),
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
    ...INLINE_READ_ERROR,
    queryKey: collaborationQueryKeys.chat.unreadTotal(),
    queryFn: ({ signal }) => apiClient.get<{ total: number }>("/chat/unread", undefined, signal, chatUnreadContract),
    staleTime: 300_000,
    refetchOnWindowFocus: true,
    enabled: !!orgId && enabled && chatEnabled && canRead,
  });
}

export function useChatOnlineUsers(enabled = true) {
  const canRead = useCan("chat:messages:read");
  return useQuery({
    queryKey: collaborationQueryKeys.chat.onlineUsers(),
    queryFn: ({ signal }) => apiClient.get<OnlineUser[]>("/chat/presence/online", undefined, signal, chatOnlineUsersContract),
    refetchInterval: 60_000,
    staleTime: 65_000,
    enabled: enabled && canRead,
  });
}

export function useChatOrgUsers(enabled = true) {
  const canRead = useCan("chat:channels:read");
  return useQuery({
    queryKey: collaborationQueryKeys.chat.orgUsers(),
    queryFn: ({ signal }) => apiClient.get<OrgUser[]>("/chat/users", undefined, signal, chatOrgUsersContract),
    staleTime: 2 * 60_000,
    enabled: enabled && canRead,
  });
}

export function usePresenceMap(enabled = true): ReadonlyMap<string, PresenceStatus> {
  const result = useChatOnlineUsers(enabled);
  return useMemo(() => {
    const map = new Map<string, PresenceStatus>();
    for (const user of result.data ?? []) {
      if (isPresenceStatus(user.status)) map.set(user.userId, user.status);
    }
    return map;
  }, [result.data]);
}

