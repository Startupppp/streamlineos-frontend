"use client";

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract, type ContractSource } from "@/lib/api-envelope";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { reportError } from "@/lib/observability/error-reporter";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import type {
  Channel,
  Message,
  MessagesPage,
  OnlineUser,
  OrgUser,
  PublicChannel,
} from "@/types/chat";
import { NO_ID_CURSOR_YET } from "@/hooks/api/cursor-page-param";

interface ChannelPage<TChannel> {
  channels: TChannel[];
  nextCursor: string | null;
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
  contract: ContractSource<ChannelPage<TChannel>>,
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
    queryKey: collaborationQueryKeys.chat.myChannels(),
    queryFn: ({ signal }) =>
      drainChannelPages<Channel>("/chat/channels", signal, myChannelsContract),
    staleTime: 300_000,
    refetchOnWindowFocus: true,
    enabled: !!orgId && enabled && chatEnabled && canRead,
  });
}

export function useArchivedChannels(enabled = true) {
  const canRead = useCan("chat:channels:read");
  return useQuery({
    queryKey: collaborationQueryKeys.chat.archivedChannels(),
    queryFn: ({ signal }) =>
      drainChannelPages<Channel>(
        "/chat/channels/archived",
        signal,
        myChannelsContract,
      ),
    staleTime: 2 * 60_000,
    enabled: enabled && canRead,
  });
}

export function usePublicChannels(enabled = true) {
  const canRead = useCan("chat:channels:read");
  return useQuery({
    queryKey: collaborationQueryKeys.chat.publicChannels(),
    queryFn: ({ signal }) =>
      drainChannelPages<PublicChannel>(
        "/chat/channels/public",
        signal,
        publicChannelsContract,
      ),
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
    queryKey: collaborationQueryKeys.chat.poll(channelId, since),
    queryFn: ({ signal }) =>
      apiClient.get<PollPage>(
        `/chat/channels/${channelId}/messages/poll`,
        { since },
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

