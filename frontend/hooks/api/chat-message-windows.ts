"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { isApiError, lazyContract } from "@/lib/api-envelope";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { useCan } from "@/hooks/api/access";
import { chatChannelReadEnabled } from "@/features/chat/chat-read-position";
import { messagesPageContract } from "@/hooks/api/chat-core-read";
import type { Message, MessagesPage } from "@/types/chat";
import type { ChatMessageContext } from "@/hooks/api/chat-schema/message-schema";

const messageContextContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatMessageContextContract),
);

const pollPageContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatPollPageContract),
);

const CHAT_CONTEXT_GC_MS = 60_000;

type ChatContextPageParam =
  | { kind: "context" }
  | { kind: "older"; cursor: number }
  | { kind: "newer"; cursor: number };

interface ChatContextPage {
  messages: Message[];
  olderCursor: number | null;
  newerCursor: number | null;
}

const CONTEXT_WINDOW_PAGE: ChatContextPageParam = { kind: "context" };

async function fetchChatContextPage(
  channelId: number,
  messageId: number,
  pageParam: ChatContextPageParam,
  signal: AbortSignal,
): Promise<ChatContextPage> {
  if (pageParam.kind === "older") {
    const page = await apiClient.get<MessagesPage>(
      `/chat/channels/${channelId}/messages`,
      { cursor: pageParam.cursor },
      signal,
      messagesPageContract,
    );
    return { messages: page.messages, olderCursor: page.nextCursor, newerCursor: null };
  }
  if (pageParam.kind === "newer") {
    const page = await apiClient.get<PollPage>(
      `/chat/channels/${channelId}/messages/poll`,
      { cursor: pageParam.cursor },
      signal,
      pollPageContract,
    );
    return {
      messages: page.messages,
      olderCursor: null,
      newerCursor: page.hasMore ? page.nextCursor : null,
    };
  }
  const context = await apiClient.get<ChatMessageContext>(
    `/chat/channels/${channelId}/messages/${messageId}/context`,
    undefined,
    signal,
    messageContextContract,
  );
  const newest = context.messages.at(-1);
  return {
    messages: context.messages,
    olderCursor: context.olderCursor,
    newerCursor: context.hasNewer ? (newest?.channelPosition ?? null) : null,
  };
}

function retryUnlessGone(failureCount: number, error: Error): boolean {
  if (isApiError(error) && (error.status === 403 || error.status === 404)) return false;
  return failureCount < 2;
}

export function useChatMessageContext(
  channelId: number,
  messageId: number,
  enabled: boolean,
) {
  const canRead = useCan("chat:messages:read");
  return useInfiniteQuery({
    ...INLINE_READ_ERROR,
    queryKey: collaborationQueryKeys.chat.messageContext(channelId, messageId),
    queryFn: ({ pageParam, signal }) =>
      fetchChatContextPage(channelId, messageId, pageParam, signal),
    initialPageParam: CONTEXT_WINDOW_PAGE,
    getNextPageParam: (oldest: ChatContextPage): ChatContextPageParam | undefined =>
      oldest.olderCursor === null ? undefined : { kind: "older", cursor: oldest.olderCursor },
    getPreviousPageParam: (newest: ChatContextPage): ChatContextPageParam | undefined =>
      newest.newerCursor === null ? undefined : { kind: "newer", cursor: newest.newerCursor },
    retry: retryUnlessGone,
    staleTime: Infinity,
    gcTime: CHAT_CONTEXT_GC_MS,
    enabled: enabled && chatChannelReadEnabled(canRead, channelId),
  });
}

type PollPage = {
  messages: Message[];
  nextCursor: number | null;
  hasMore: boolean;
  latestPosition: number | null;
};

export type ChatPollPosition =
  | { kind: "since"; since: string }
  | { kind: "cursor"; cursor: number };

function chatPollPositionKey(position: ChatPollPosition): string {
  return position.kind === "since"
    ? `since:${position.since}`
    : `cursor:${position.cursor}`;
}

const CHAT_POLL_FALLBACK_INTERVAL_MS = 30_000;

export function useChatPoll(
  channelId: number,
  position: ChatPollPosition,
  enabled: boolean,
) {
  const canRead = useCan("chat:messages:read");
  return useQuery({
    ...INLINE_READ_ERROR,
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
    enabled: enabled && chatChannelReadEnabled(canRead, channelId),
    refetchInterval: enabled && canRead ? CHAT_POLL_FALLBACK_INTERVAL_MS : false,
  });
}
