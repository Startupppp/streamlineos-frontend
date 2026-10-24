import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import {
  findChannelRow,
  moveChannelRowToTop,
  patchChannelDetail,
  patchChannelRow,
} from "@/hooks/api/chat-channel-cache";
import { runRollbacks, type ChatCacheRollback } from "@/hooks/api/chat-message-cache";
import type { ChatChannelDetailWire } from "@/hooks/api/chat-extra-schema";
import type { Channel, Message, MessagesPage } from "@/types/chat";

const UNREAD_TOTAL_CAP = 100;

type OwnMemberPatch = Partial<
  Pick<Channel["members"][number], "mutedUntil" | "isFavorite" | "notificationPreference">
> & { archivedAt?: string | null };

export function patchUnreadTotal(
  queryClient: QueryClient,
  fn: (total: number) => number,
): ChatCacheRollback {
  const key = collaborationQueryKeys.chat.unreadTotal();
  const previous = queryClient.getQueryData<{ total: number }>(key);
  if (!previous) return () => undefined;
  const next = { total: Math.min(UNREAD_TOTAL_CAP, Math.max(0, fn(previous.total))) };
  if (next.total === previous.total) return () => undefined;
  const stored = queryClient.setQueryData<{ total: number }>(key, next);
  return () => {
    queryClient.setQueryData<{ total: number }>(key, (current) =>
      current === stored ? previous : current,
    );
  };
}

export function patchOwnMember(
  queryClient: QueryClient,
  channelId: number,
  userId: string | undefined,
  patch: OwnMemberPatch,
): ChatCacheRollback {
  if (!userId) return () => undefined;
  const { archivedAt, ...listPatch } = patch;
  const rollbacks = [
    patchChannelRow(queryClient, channelId, (channel) => ({
      ...channel,
      members: channel.members.map((member) =>
        member.userId === userId ? { ...member, ...listPatch } : member,
      ),
    })),
    patchChannelDetail(queryClient, channelId, (detail) => ({
      ...detail,
      members: detail.members.map((member) =>
        member.userId === userId
          ? { ...member, ...listPatch, ...(archivedAt !== undefined && { archivedAt }) }
          : member,
      ),
    })),
  ];
  return () => runRollbacks(rollbacks);
}

function newestPersistedAt(queryClient: QueryClient, channelId: number): string | null {
  const pages = queryClient.getQueryData<InfiniteData<MessagesPage>>(
    collaborationQueryKeys.chat.messages(channelId),
  )?.pages;
  let newest: string | null = null;
  for (const message of pages?.flatMap((page) => page.messages) ?? []) {
    if (message.id < 0) continue;
    if (newest === null || Date.parse(message.createdAt) > Date.parse(newest)) newest = message.createdAt;
  }
  return newest;
}

export function applyPeerRead(
  detail: ChatChannelDetailWire,
  read: { userId: string; lastReadPosition: number; lastReadAt: string },
): ChatChannelDetailWire {
  const others = (detail.peerReads ?? []).filter((peer) => peer.userId !== read.userId);
  const known = detail.peerReads?.find((peer) => peer.userId === read.userId);
  if (known && known.lastReadPosition >= read.lastReadPosition) return detail;
  return { ...detail, peerReads: [...others, read] };
}

export function applyOptimisticRead(
  queryClient: QueryClient,
  channelId: number,
  userId: string | undefined,
): ChatCacheRollback {
  const unread = findChannelRow(queryClient, channelId)?.unreadCount ?? 0;
  const readAt = newestPersistedAt(queryClient, channelId);
  const rollbacks: ChatCacheRollback[] = [];
  if (unread > 0)
    rollbacks.push(
      patchChannelRow(queryClient, channelId, (channel) => ({ ...channel, unreadCount: 0 })),
      patchUnreadTotal(queryClient, (total) => total - unread),
    );
  if (readAt !== null && userId)
    rollbacks.push(
      patchChannelDetail(queryClient, channelId, (detail) => ({
        ...detail,
        members: detail.members.map((member) =>
          member.userId === userId &&
          (member.lastReadAt === null || Date.parse(readAt) > Date.parse(member.lastReadAt))
            ? { ...member, lastReadAt: readAt }
            : member,
        ),
      })),
    );
  return () => runRollbacks(rollbacks);
}

export function reconcileUnreadAfterRead(
  queryClient: QueryClient,
  rowWasLoaded: boolean,
): void {
  if (rowWasLoaded) return;
  void queryClient.invalidateQueries({
    queryKey: collaborationQueryKeys.chat.unreadTotal(),
    exact: true,
  });
}

export function applyDeletedUnread(
  queryClient: QueryClient,
  deleted: Message | undefined,
  userId: string | undefined,
): void {
  if (!deleted || deleted.id < 0 || deleted.isDeleted || !userId || deleted.senderId === userId) return;
  const channelId = deleted.channelId;
  const row = findChannelRow(queryClient, channelId);
  if (!row || row.unreadCount === 0) return;
  const own = queryClient
    .getQueryData<ChatChannelDetailWire>(collaborationQueryKeys.chat.channel(channelId))
    ?.members.find((member) => member.userId === userId);
  if (!own) return;
  const unread =
    own.lastReadAt === null || Date.parse(deleted.createdAt) > Date.parse(own.lastReadAt);
  if (unread) decrementChannelUnread(queryClient, channelId);
}

export function decrementChannelUnread(queryClient: QueryClient, channelId: number): void {
  if ((findChannelRow(queryClient, channelId)?.unreadCount ?? 0) === 0) return;
  patchChannelRow(queryClient, channelId, (channel) => ({
    ...channel,
    unreadCount: Math.max(0, channel.unreadCount - 1),
  }));
  patchUnreadTotal(queryClient, (total) => total - 1);
}

export function applyOptimisticUnread(
  queryClient: QueryClient,
  channelId: number,
): ChatCacheRollback {
  const row = findChannelRow(queryClient, channelId);
  if (!row?.lastMessage || row.unreadCount > 0) return () => undefined;
  const rollbacks = [
    patchChannelRow(queryClient, channelId, (channel) => ({ ...channel, unreadCount: 1 })),
    patchUnreadTotal(queryClient, (total) => total + 1),
  ];
  return () => runRollbacks(rollbacks);
}

interface InboundChannelMessage {
  channelId: number;
  content: string | null;
  senderName: string | null;
  createdAt: string;
  countsAsUnread: boolean;
}

export function recordInboundChannelMessage(
  queryClient: QueryClient,
  inbound: InboundChannelMessage,
): void {
  moveChannelRowToTop(queryClient, inbound.channelId, (channel) => ({
    ...channel,
    lastMessage: {
      content: inbound.content,
      senderName: inbound.senderName,
      createdAt: inbound.createdAt,
    },
    unreadCount: inbound.countsAsUnread ? channel.unreadCount + 1 : channel.unreadCount,
  }));
  if (inbound.countsAsUnread) patchUnreadTotal(queryClient, (total) => total + 1);
}

export function markChannelTimelineStale(queryClient: QueryClient, channelId: number): void {
  void queryClient.invalidateQueries({
    queryKey: collaborationQueryKeys.chat.messages(channelId),
    exact: true,
    refetchType: "none",
  });
  void queryClient.invalidateQueries({
    queryKey: collaborationQueryKeys.chat.messageContextsInChannel(channelId),
    refetchType: "none",
  });
}

export function refreshJoinedChannel(queryClient: QueryClient, channelId: number): void {
  void queryClient.invalidateQueries({
    queryKey: collaborationQueryKeys.chat.myChannels(),
    exact: true,
    refetchType: findChannelRow(queryClient, channelId) ? "none" : "active",
  });
  for (const queryKey of [
    collaborationQueryKeys.chat.messages(channelId),
    collaborationQueryKeys.chat.channel(channelId),
    collaborationQueryKeys.chat.messageContextsInChannel(channelId),
    collaborationQueryKeys.chat.pins(channelId),
    collaborationQueryKeys.chat.huddle(channelId),
  ])
    void queryClient.refetchQueries({
      queryKey,
      type: "active",
      predicate: (query) => query.state.status === "error",
    });
}

export function invalidateChatReconnect(
  queryClient: QueryClient,
  channelId: number,
): Promise<void> {
  const messagesRefetched = queryClient.invalidateQueries({
    queryKey: collaborationQueryKeys.chat.messages(channelId),
  });
  void queryClient.invalidateQueries({
    queryKey: collaborationQueryKeys.chat.threadsInChannel(channelId),
  });
  void queryClient.invalidateQueries({
    queryKey: collaborationQueryKeys.chat.myChannels(),
    exact: true,
  });
  void queryClient.invalidateQueries({
    queryKey: collaborationQueryKeys.chat.unreadTotal(),
    exact: true,
  });
  return messagesRefetched;
}
