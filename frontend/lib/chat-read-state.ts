import type { QueryClient } from "@tanstack/react-query";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";

export function invalidateChatUnreadState(queryClient: QueryClient): void {
  queryClient.invalidateQueries({
    queryKey: collaborationQueryKeys.chat.myChannels(),
    exact: true,
  });
  queryClient.invalidateQueries({
    queryKey: collaborationQueryKeys.chat.unreadTotal(),
    exact: true,
  });
}

export function invalidateChatChannelMessages(
  queryClient: QueryClient,
  channelId: number,
): void {
  queryClient.invalidateQueries({
    queryKey: collaborationQueryKeys.chat.messages(channelId),
    exact: false,
  });
}

export function invalidateChatMessageSent(
  queryClient: QueryClient,
  channelId: number,
  hasAttachments: boolean,
): void {
  invalidateChatChannelMessages(queryClient, channelId);
  queryClient.invalidateQueries({
    queryKey: collaborationQueryKeys.chat.myChannels(),
    exact: true,
  });
  if (hasAttachments)
    queryClient.invalidateQueries({
      queryKey: collaborationQueryKeys.chat.channelFiles(channelId),
    });
}

function invalidateChatMessageBodyChanged(
  queryClient: QueryClient,
  channelId: number,
): void {
  invalidateChatChannelMessages(queryClient, channelId);
  queryClient.invalidateQueries({
    queryKey: collaborationQueryKeys.chat.threadsInChannel(channelId),
    exact: false,
  });
  queryClient.invalidateQueries({
    queryKey: collaborationQueryKeys.chat.pins(channelId),
    exact: true,
  });
  queryClient.invalidateQueries({
    queryKey: collaborationQueryKeys.chat.savedMessages(),
    exact: true,
  });
  queryClient.invalidateQueries({
    queryKey: collaborationQueryKeys.chat.myChannels(),
    exact: true,
  });
}

export function invalidateChatMessageEdited(
  queryClient: QueryClient,
  channelId: number,
): void {
  invalidateChatMessageBodyChanged(queryClient, channelId);
}

export function invalidateChatMessageDeleted(
  queryClient: QueryClient,
  channelId: number,
): void {
  invalidateChatMessageBodyChanged(queryClient, channelId);
}

export function invalidateChatChannelRead(
  queryClient: QueryClient,
  channelId: number,
): void {
  invalidateChatUnreadState(queryClient);
  queryClient.invalidateQueries({
    queryKey: collaborationQueryKeys.chat.channel(channelId),
  });
}

export function invalidateChatInboundMessage(
  queryClient: QueryClient,
  channelId: number,
  replyToId: number | null,
): void {
  invalidateChatUnreadState(queryClient);
  if (replyToId !== null)
    queryClient.invalidateQueries({
      queryKey: collaborationQueryKeys.chat.thread(channelId, replyToId),
      exact: true,
    });
}

export function invalidateChatReconnect(
  queryClient: QueryClient,
  channelId: number,
): void {
  invalidateChatChannelMessages(queryClient, channelId);
  invalidateChatUnreadState(queryClient);
}
