import type { InfiniteData, QueryClient, QueryKey } from "@tanstack/react-query";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import type { Channel, ChannelPage, PublicChannel } from "@/types/chat";
import type { ChatChannelDetailWire } from "@/hooks/api/chat-extra-schema";
import {
  mapPages,
  patchItems,
  runRollbacks,
  type ChatCacheRollback,
} from "@/hooks/api/chat-message-cache";

type ChannelList<TChannel> = InfiniteData<ChannelPage<TChannel>>;
type ChannelDetailMember = ChatChannelDetailWire["members"][number];
type ListMemberPatch = Partial<
  Pick<Channel["members"][number], "mutedUntil" | "isFavorite" | "notificationPreference">
>;
type DetailMemberPatch = ListMemberPatch &
  Partial<Pick<ChannelDetailMember, "lastReadAt" | "archivedAt">>;

const UNREAD_TOTAL_CAP = 100;

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
  await Promise.all([
    ...memberListKeys().map((queryKey) =>
      queryClient.cancelQueries({ queryKey, exact: true }),
    ),
    queryClient.cancelQueries({
      queryKey: collaborationQueryKeys.chat.publicChannels(),
      exact: true,
    }),
    queryClient.cancelQueries({
      queryKey: collaborationQueryKeys.chat.unreadTotal(),
      exact: true,
    }),
    queryClient.cancelQueries({
      queryKey: collaborationQueryKeys.chat.channel(channelId),
      exact: true,
    }),
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

export function insertChannelRow(
  queryClient: QueryClient,
  queryKey: QueryKey,
  channel: Channel,
): ChatCacheRollback {
  const data = queryClient.getQueryData<ChannelList<Channel>>(queryKey);
  if (!data || data.pages.length === 0) return () => undefined;
  queryClient.setQueryData<ChannelList<Channel>>(queryKey, (current) =>
    current && {
      ...current,
      pages: current.pages.map((page, index) => {
        const channels = page.channels.filter((c) => c.id !== channel.id);
        return index === 0 ? { ...page, channels: [channel, ...channels] } : { ...page, channels };
      }),
    },
  );
  return () => {
    queryClient.setQueryData<ChannelList<Channel>>(queryKey, (current) =>
      current && {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          channels: page.channels.filter((c) => c !== channel),
        })),
      },
    );
  };
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

export function patchChannelDetail(
  queryClient: QueryClient,
  channelId: number,
  fn: (detail: ChatChannelDetailWire) => ChatChannelDetailWire,
): ChatCacheRollback {
  const key = collaborationQueryKeys.chat.channel(channelId);
  const previous = queryClient.getQueryData<ChatChannelDetailWire>(key);
  if (!previous) return () => undefined;
  const next = fn(previous);
  queryClient.setQueryData<ChatChannelDetailWire>(key, next);
  return () => {
    queryClient.setQueryData<ChatChannelDetailWire>(key, (current) =>
      current === next ? previous : current,
    );
  };
}

export function patchOwnMember(
  queryClient: QueryClient,
  channelId: number,
  userId: string | undefined,
  patch: DetailMemberPatch,
): ChatCacheRollback {
  if (!userId) return () => undefined;
  const { lastReadAt, archivedAt, ...listPatch } = patch;
  const detailExtra = {
    ...(lastReadAt !== undefined && { lastReadAt }),
    ...(archivedAt !== undefined && { archivedAt }),
  };
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
        member.userId === userId ? { ...member, ...listPatch, ...detailExtra } : member,
      ),
    })),
  ];
  return () => runRollbacks(rollbacks);
}

export function patchUnreadTotal(
  queryClient: QueryClient,
  fn: (total: number) => number,
): ChatCacheRollback {
  const key = collaborationQueryKeys.chat.unreadTotal();
  const previous = queryClient.getQueryData<{ total: number }>(key);
  if (!previous) return () => undefined;
  const next = { total: Math.min(UNREAD_TOTAL_CAP, Math.max(0, fn(previous.total))) };
  if (next.total === previous.total) return () => undefined;
  queryClient.setQueryData<{ total: number }>(key, next);
  return () => {
    queryClient.setQueryData<{ total: number }>(key, (current) =>
      current === next ? previous : current,
    );
  };
}
