"use client";

import { useCallback, useMemo } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import {
  lazyContract,
  type ContractSource,
  type LazyResponseContract,
} from "@/lib/api-envelope";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { reportError } from "@/lib/observability/error-reporter";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import type {
  Channel,
  ChannelPage,
  Message,
  MessagesPage,
  OnlineUser,
  OrgUser,
  PublicChannel,
} from "@/types/chat";
import { NO_ID_CURSOR_YET } from "@/hooks/api/cursor-page-param";

/**
 * What a channel-list consumer gets instead of a plain array. `hasMore` and
 * `isTruncated` are the two states the eager drain could not express: the first
 * says "more exist, ask for them", the second says "the client stopped asking".
 */
export interface ChannelListResult<TChannel> {
  channels: TChannel[];
  hasMore: boolean;
  isTruncated: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  /** Kept on the adapter so a permission gate stays directly assertable. */
  fetchStatus: "fetching" | "paused" | "idle";
  isError: boolean;
  error: Error | null;
  loadMore: () => void;
  refetch: () => void;
}

/**
 * `chat.ts` is a barrel the sidebar imports, so every eager value import in this
 * file reached Zod from the dashboard shell — and therefore from every
 * authenticated route, including the ones with no chat surface at all.
 *
 * The page contracts are COMPOSED (`chatChannelPageContract(row)` builds a new
 * schema on each call), which is why these go through `lazyContract`: it
 * memoises the load, so each schema is still constructed exactly once per
 * module rather than once per request. The contract itself is unchanged and is
 * still passed to the seam, so `/chat/channels` — the route the
 * `members[].membership.user` defect shipped through — is parsed as before.
 */
const myChannelsContract: LazyResponseContract<ChannelPage<Channel>> =
  lazyContract(() =>
    import("@/hooks/api/chat-schema").then((m) =>
      m.chatChannelPageContract(m.chatChannelContract),
    ),
  );

const publicChannelsContract: LazyResponseContract<ChannelPage<PublicChannel>> =
  lazyContract(() =>
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

/**
 * The route answers one keyset page of 50 and a `nextCursor`. Reading only the
 * first page truncated the sidebar, the forward dialog and the channel combobox
 * with nothing on screen to say a channel was missing; following the cursor to
 * exhaustion made every mount pay for the whole channel set, which grows with
 * the tenant, and at the ceiling it returned a plain array — no cursor, no
 * truncated verdict, nothing a screen could render.
 *
 * So the drain is gone. One page is fetched, and the remaining state travels
 * with it: `hasMore` means the consumer may ask for more, `isTruncated` means
 * the client itself stopped asking at the ceiling. A repeated cursor is a server
 * fault, not a page, so it is reported and ends the sequence rather than
 * spinning.
 */
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

/**
 * The route stays a LITERAL at each hook's own `fetchChannelPage` call. Hoisting
 * it into this adapter as a `path` option made `check:response-contracts` lose
 * two routes and gain an unresolvable seam site — the scanner reads the first
 * argument, so a path that arrives as a parameter is invisible to every
 * route-based rule in that gate and in `check:gated-reads`.
 */
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
    queryFn: ({ signal }) => apiClient.get<Channel>(`/chat/channels/${channelId}`, undefined, signal, channelDetailContract),
    staleTime: 2 * 60_000,
    enabled: canRead && channelId > 0,
  });
}

export function useChatMessages(channelId: number) {
  const canRead = useCan("chat:messages:read");
  return useInfiniteQuery({
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

/**
 * Where the caller has read up to. `cursor` is `chat_messages.channel_position`,
 * a server-assigned monotonic integer, and it is the only position that survives
 * a skewed client clock, a multi-page outage or an arrival mid-recovery.
 * `since` exists solely to open a sequence for a caller who holds no position
 * yet, and even then the timestamp should come from a server-authored message
 * rather than the browser's wall clock.
 */
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

