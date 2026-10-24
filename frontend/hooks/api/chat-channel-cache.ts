import type { InfiniteData, QueryClient, QueryKey } from "@tanstack/react-query";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import type { Channel, ChannelPage, Message, MessagesPage, PublicChannel } from "@/types/chat";
import type { ChatChannelDetailWire } from "@/hooks/api/chat-extra-schema";
import {
  cancelLoadedQueries,
  mapPages,
  patchItems,
  runRollbacks,
  type ChatCacheRollback,
} from "@/hooks/api/chat-message-cache";

type ChannelList<TChannel> = InfiniteData<ChannelPage<TChannel>>;

function memberListKeys(): QueryKey[] {
  return [
    collaborationQueryKeys.chat.myChannels(),
    collaborationQueryKeys.chat.archivedChannels(),
  ];
}

export async function cancelChatChannelQueries(
  queryClient: QueryClient,
  channelId: number,
): Promise<void> {
  await cancelLoadedQueries(queryClient, [
    ...memberListKeys(),
    collaborationQueryKeys.chat.publicChannels(),
    collaborationQueryKeys.chat.unreadTotal(),
    collaborationQueryKeys.chat.channel(channelId),
  ]);
}

function mapRows<TChannel extends { id: number }>(
  data: ChannelList<TChannel> | undefined,
  channelId: number,
  fn: (channel: TChannel) => TChannel,
): ChannelList<TChannel> | undefined {
  return mapPages(data, (page) =>
    page.channels.some((channel) => channel.id === channelId)
      ? {
          ...page,
          channels: page.channels.map((channel) =>
            channel.id === channelId ? fn(channel) : channel,
          ),
        }
      : page,
  );
}

export function findChannelRow(
  queryClient: QueryClient,
  channelId: number,
): Channel | undefined {
  for (const queryKey of memberListKeys()) {
    const found = queryClient
      .getQueryData<ChannelList<Channel>>(queryKey)
      ?.pages.flatMap((page) => page.channels)
      .find((channel) => channel.id === channelId);
    if (found) return found;
  }
  return undefined;
}

export function patchChannelRow(
  queryClient: QueryClient,
  channelId: number,
  fn: (channel: Channel) => Channel,
): ChatCacheRollback {
  const rollbacks = memberListKeys().flatMap((queryKey) => {
    const rollback = patchItems<ChannelList<Channel>, Channel>(
      queryClient,
      queryKey,
      (data, map) => mapRows(data, channelId, map),
      fn,
    );
    return rollback ? [rollback] : [];
  });
  return () => runRollbacks(rollbacks);
}

export function patchPublicChannel(
  queryClient: QueryClient,
  channelId: number,
  fn: (channel: PublicChannel) => PublicChannel,
): ChatCacheRollback {
  return (
    patchItems<ChannelList<PublicChannel>, PublicChannel>(
      queryClient,
      collaborationQueryKeys.chat.publicChannels(),
      (data, map) => mapRows(data, channelId, map),
      fn,
    ) ?? (() => undefined)
  );
}

export function removeChannelRow(
  queryClient: QueryClient,
  queryKey: QueryKey,
  channelId: number,
): { removed: Channel | undefined; rollback: ChatCacheRollback } {
  const data = queryClient.getQueryData<ChannelList<Channel>>(queryKey);
  const pageIndex = data?.pages.findIndex((page) =>
    page.channels.some((channel) => channel.id === channelId),
  );
  if (!data || pageIndex === undefined || pageIndex < 0)
    return { removed: undefined, rollback: () => undefined };
  const page = data.pages[pageIndex];
  const rowIndex = page.channels.findIndex((channel) => channel.id === channelId);
  const removed = page.channels[rowIndex];
  queryClient.setQueryData<ChannelList<Channel>>(queryKey, (current) =>
    current && {
      ...current,
      pages: current.pages.map((p) => ({
        ...p,
        channels: p.channels.filter((channel) => channel.id !== channelId),
      })),
    },
  );
  const rollback = () => {
    queryClient.setQueryData<ChannelList<Channel>>(queryKey, (current) => {
      if (!current || current.pages.some((p) => p.channels.some((c) => c.id === channelId)))
        return current;
      return {
        ...current,
        pages: current.pages.map((p, index) =>
          index === Math.min(pageIndex, current.pages.length - 1)
            ? {
                ...p,
                channels: [
                  ...p.channels.slice(0, rowIndex),
                  removed,
                  ...p.channels.slice(rowIndex),
                ],
              }
            : p,
        ),
      };
    });
  };
  return { removed, rollback };
}

export function insertChannelRow<TChannel extends { id: number }>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  channel: TChannel,
): ChatCacheRollback {
  const data = queryClient.getQueryData<ChannelList<TChannel>>(queryKey);
  if (!data || data.pages.length === 0) return () => undefined;
  queryClient.setQueryData<ChannelList<TChannel>>(queryKey, (current) =>
    current && {
      ...current,
      pages: current.pages.map((page, index) => {
        const channels = page.channels.filter((c) => c.id !== channel.id);
        return index === 0 ? { ...page, channels: [channel, ...channels] } : { ...page, channels };
      }),
    },
  );
  return () => {
    queryClient.setQueryData<ChannelList<TChannel>>(queryKey, (current) =>
      current && {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          channels: page.channels.filter((c) => c.id !== channel.id),
        })),
      },
    );
  };
}

export function findPublicChannel(
  queryClient: QueryClient,
  channelId: number,
): PublicChannel | undefined {
  return queryClient
    .getQueryData<ChannelList<PublicChannel>>(collaborationQueryKeys.chat.publicChannels())
    ?.pages.flatMap((page) => page.channels)
    .find((channel) => channel.id === channelId);
}

export function replaceChannelRow(
  queryClient: QueryClient,
  queryKey: QueryKey,
  previousId: number,
  channel: Channel,
): void {
  queryClient.setQueryData<ChannelList<Channel>>(queryKey, (current) => {
    if (!current || current.pages.length === 0) return current;
    const pages = current.pages.map((page) => ({
      ...page,
      channels: page.channels.filter((c) => c.id !== previousId && c.id !== channel.id),
    }));
    pages[0] = { ...pages[0], channels: [channel, ...pages[0].channels] };
    return { ...current, pages };
  });
}

export function moveChannelRowToTop(
  queryClient: QueryClient,
  channelId: number,
  fn: (channel: Channel) => Channel,
): ChatCacheRollback {
  const key = collaborationQueryKeys.chat.myChannels();
  const { removed, rollback } = removeChannelRow(queryClient, key, channelId);
  if (!removed) return rollback;
  const moved = fn(removed);
  const undoInsert = insertChannelRow(queryClient, key, moved);
  return () => runRollbacks([rollback, undoInsert]);
}

function latestVisibleMessageFromPages(
  messagesData: InfiniteData<MessagesPage> | undefined,
  excludeMessageId?: number,
): Message | null {
  if (!messagesData) return null;
  const remaining = messagesData.pages
    .flatMap((p) => p.messages)
    .filter(
      (m) =>
        m.id > 0 &&
        !m.isDeleted &&
        (excludeMessageId === undefined || m.id !== excludeMessageId),
    );
  if (remaining.length === 0) return null;
  return remaining.reduce((max, m) => (m.id > max.id ? m : max));
}

function lastMessageFromMessage(message: Message | null) {
  if (!message) return null;
  return {
    content: message.content,
    senderName: message.sender.name ?? null,
    createdAt: message.createdAt,
  };
}

export function patchLastMessageAfterDelete(
  queryClient: QueryClient,
  channelId: number,
  deletedMessageId: number,
): ChatCacheRollback {
  const messagesKey = collaborationQueryKeys.chat.messages(channelId);
  const messagesData = queryClient.getQueryData<InfiniteData<MessagesPage>>(messagesKey);
  const latest = latestVisibleMessageFromPages(messagesData, deletedMessageId);

  if (!messagesData) {
    void queryClient.invalidateQueries({
      queryKey: collaborationQueryKeys.chat.myChannels(),
      exact: true,
      refetchType: "active",
    });
    return () => undefined;
  }

  return patchChannelRow(queryClient, channelId, (channel) => ({
    ...channel,
    lastMessage: lastMessageFromMessage(latest),
  }));
}

export function patchLastMessageIfLatest(
  queryClient: QueryClient,
  channelId: number,
  messageId: number,
  content: string | null,
): ChatCacheRollback {
  const messagesKey = collaborationQueryKeys.chat.messages(channelId);
  const messagesData = queryClient.getQueryData<InfiniteData<MessagesPage>>(messagesKey);
  const latest = latestVisibleMessageFromPages(messagesData);
  if (!latest || latest.id !== messageId) return () => undefined;
  return patchChannelRow(queryClient, channelId, (channel) => ({
    ...channel,
    lastMessage: {
      content,
      senderName: latest.sender.name ?? channel.lastMessage?.senderName ?? null,
      createdAt: latest.createdAt,
    },
  }));
}

export function patchChannelDetail(
  queryClient: QueryClient,
  channelId: number,
  fn: (detail: ChatChannelDetailWire) => ChatChannelDetailWire,
): ChatCacheRollback {
  const key = collaborationQueryKeys.chat.channel(channelId);
  const previous = queryClient.getQueryData<ChatChannelDetailWire>(key);
  if (!previous) return () => undefined;
  const stored = queryClient.setQueryData<ChatChannelDetailWire>(key, fn(previous));
  return () => {
    queryClient.setQueryData<ChatChannelDetailWire>(key, (current) =>
      current === stored ? previous : current,
    );
  };
}
