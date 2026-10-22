"use client";

import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract, type ContractSource } from "@/lib/api-envelope";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { chatUnreadTotalQueryOptions } from "@/hooks/api/chat-read-options";
import { reportError } from "@/lib/observability/error-reporter";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { isPresenceStatus, type PresenceStatus } from "@/lib/presence";
import { chatChannelReadEnabled } from "@/features/chat/chat-read-position";
import { keepConfirmedMessages } from "@/features/chat/message-page-merge";
import type {
  Channel,
  ChannelPage,
  MessagesPage,
  OrgUser,
  PublicChannel,
} from "@/types/chat";
import type { ChatOnlineUser } from "@/hooks/api/chat-schema/presence-schema";
import type { ChatChannelDetailWire } from "@/hooks/api/chat-extra-schema";
import { NO_ID_CURSOR_YET, NULL_CURSOR_YET } from "@/hooks/api/cursor-page-param";

interface ChannelListResult<TChannel> {
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

export const messagesPageContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatMessagesPageContract),
);

const CHAT_MESSAGES_STALE_MS = 15_000;
const CHAT_MESSAGES_GC_MS = 30 * 60_000;

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

const MAX_CHANNEL_PAGES = 20;

async function fetchChannelPage<TChannel>(
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
    initialPageParam: NULL_CURSOR_YET,
    getNextPageParam: (lastPage: ChannelPage<TChannel>, allPages) =>
      allPages.length >= MAX_CHANNEL_PAGES ? undefined : lastPage.nextCursor,
    staleTime,
    refetchOnWindowFocus,
    enabled,
  });

  const pages = query.data?.pages;
  const channels = pages === undefined ? [] : pages.flatMap((p) => p.channels);

  const { hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = query;

  function loadMore() {
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  }

  function handleRefetch() {
    void refetch();
  }

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

function chatChannelQueryOptions(channelId: number) {
  return queryOptions({
    ...INLINE_READ_ERROR,
    queryKey: collaborationQueryKeys.chat.channel(channelId),
    queryFn: ({ signal }) => apiClient.get<ChatChannelDetailWire>(`/chat/channels/${channelId}`, undefined, signal, channelDetailContract),
    staleTime: 2 * 60_000,
  });
}

function chatMessagesQueryOptions(channelId: number) {
  return infiniteQueryOptions({
    ...INLINE_READ_ERROR,
    queryKey: collaborationQueryKeys.chat.messages(channelId),
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<MessagesPage>(
        `/chat/channels/${channelId}/messages`,
        pageParam !== undefined ? { cursor: pageParam } : undefined,
        signal,
        messagesPageContract,
      ),
    getNextPageParam: (lastPage: MessagesPage) => lastPage.nextCursor,
    initialPageParam: NO_ID_CURSOR_YET,
    staleTime: CHAT_MESSAGES_STALE_MS,
    gcTime: CHAT_MESSAGES_GC_MS,
    structuralSharing: keepConfirmedMessages,
  });
}

export function useChatChannel(channelId: number, enabled = true) {
  const canRead = useCan("chat:channels:read");
  return useQuery({
    ...chatChannelQueryOptions(channelId),
    enabled: enabled && chatChannelReadEnabled(canRead, channelId),
  });
}

export function useChatMessages(channelId: number) {
  const canRead = useCan("chat:messages:read");
  return useInfiniteQuery({
    ...chatMessagesQueryOptions(channelId),
    enabled: chatChannelReadEnabled(canRead, channelId),
  });
}

export function usePrefetchChatChannel(): (channelId: number) => void {
  const queryClient = useQueryClient();
  const canReadChannels = useCan("chat:channels:read");
  const canReadMessages = useCan("chat:messages:read");
  return (channelId: number) => {
    if (chatChannelReadEnabled(canReadMessages, channelId))
      void queryClient.prefetchInfiniteQuery(chatMessagesQueryOptions(channelId));
    if (chatChannelReadEnabled(canReadChannels, channelId))
      void queryClient.prefetchQuery(chatChannelQueryOptions(channelId));
  };
}

export function useChatUnreadTotal(enabled = true) {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const canRead = useCan("chat:messages:read");
  const chatEnabled = useModuleEnabled("chat");
  return useQuery({
    ...INLINE_READ_ERROR,
    ...chatUnreadTotalQueryOptions,
    queryFn: ({ signal }) => apiClient.get<{ total: number }>("/chat/unread", undefined, signal, chatUnreadContract),
    refetchOnWindowFocus: true,
    enabled: !!orgId && enabled && chatEnabled && canRead,
  });
}

export function useChatOnlineUsers(enabled = true) {
  const canRead = useCan("chat:messages:read");
  return useQuery({
    queryKey: collaborationQueryKeys.chat.onlineUsers(),
    queryFn: ({ signal }) => apiClient.get<ChatOnlineUser[]>("/chat/presence/online", undefined, signal, chatOnlineUsersContract),
    refetchInterval: 60_000,
    staleTime: 65_000,
    ...INLINE_READ_ERROR,
    enabled: enabled && canRead,
  });
}

export function useChatOrgUsers(enabled = true) {
  const canRead = useCan("chat:channels:read");
  return useQuery({
    ...INLINE_READ_ERROR,
    queryKey: collaborationQueryKeys.chat.orgUsers(),
    queryFn: ({ signal }) => apiClient.get<OrgUser[]>("/chat/users", undefined, signal, chatOrgUsersContract),
    staleTime: 2 * 60_000,
    enabled: enabled && canRead,
  });
}

export function usePresenceMap(enabled = true): ReadonlyMap<string, PresenceStatus> {
  const result = useChatOnlineUsers(enabled);
  const map = new Map<string, PresenceStatus>();
  for (const user of result.data ?? []) {
    if (isPresenceStatus(user.status)) map.set(user.userId, user.status);
  }
  return map;
}

interface PresenceCustomStatus {
  statusMessage: string | null;
  statusExpiresAt: string | null;
}

export function usePresenceCustomStatus(
  userId: string | undefined,
  enabled = true,
): PresenceCustomStatus {
  const result = useChatOnlineUsers(enabled);
  const row = userId
    ? result.data?.find((user) => user.userId === userId)
    : undefined;
  return {
    statusMessage: row?.statusMessage ?? null,
    statusExpiresAt: row?.statusExpiresAt ?? null,
  };
}

