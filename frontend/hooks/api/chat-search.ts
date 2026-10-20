"use client";

import {
  useQuery,
  useQueryClient,
  useInfiniteQuery,
  keepPreviousData,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";

const chatOkContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatOkContract),
);
const chatPinsContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatPinsContract),
);
const chatThreadPageContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatThreadPageContract),
);
const chatSendResponseContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatSendResponseContract),
);
const chatSearchMessagesContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatSearchMessagesContract),
);
const chatSearchChannelsContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatSearchChannelsContract),
);
const chatSearchUsersContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatSearchUsersContract),
);
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import {
  cancelLoadedQueries,
  findCachedMessage,
  nextChatTempId,
  type ChatCacheRollback,
} from "@/hooks/api/chat-message-cache";
import {
  appendThreadReply,
  reconcileThreadReply,
  removeThreadReply,
} from "@/features/chat/message-page-merge";
import {
  chatSendRetry,
  optimisticMessage,
  reconcileSentMessage,
  sendClientKey,
} from "@/hooks/api/chat-send-policy";
import type {
  AttachmentInput,
  PinnedMessage,
  ThreadPage,
  SearchMessagesResult,
  SearchChannelResult,
  SearchUserResult,
} from "@/types/chat";
import type { ChatSendResponse } from "@/hooks/api/chat-schema";
import { NO_ID_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

export function useChatPins(channelId: number) {
  const canRead = useCan("chat:messages:read");
  return useQuery({
    ...INLINE_READ_ERROR,
    queryKey: collaborationQueryKeys.chat.pins(channelId),
    queryFn: ({ signal }) =>
      apiClient.get<PinnedMessage[]>(`/chat/channels/${channelId}/pins`, undefined, signal, chatPinsContract),
    staleTime: 2 * 60_000,
    enabled: canRead && channelId > 0,
  });
}

interface RollbackContext {
  rollback: ChatCacheRollback;
}

function pinFor(
  queryClient: QueryClient,
  channelId: number,
  messageId: number,
  pinner: { id: string; name: string | null } | null,
): PinnedMessage | null {
  const message = findCachedMessage(queryClient, channelId, messageId);
  if (!message) return null;
  const { sender } = message;
  return {
    id: nextChatTempId(),
    channelId,
    messageId,
    pinnedAt: new Date().toISOString(),
    pinnedBy: pinner?.id ?? null,
    pinnedByUser: pinner,
    message: {
      ...message,
      sender: sender.id === null ? null : { id: sender.id, name: sender.name, image: sender.image },
    },
  };
}

export function usePinMessage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user;
  return useAuthorizedMutation<{ ok: boolean }, Error, { channelId: number; messageId: number }, RollbackContext>(
    "chat:messages:pin",
    {
      mutationKey: ["chat", "messages", "pin"],
      mutationFn: ({ channelId, messageId }) =>
        apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/pins`, { messageId }, undefined, chatOkContract),
      onMutate: async ({ channelId, messageId }) => {
        const key = collaborationQueryKeys.chat.pins(channelId);
        await cancelLoadedQueries(queryClient, [key]);
        const pins = queryClient.getQueryData<PinnedMessage[]>(key);
        const pin = pinFor(
          queryClient,
          channelId,
          messageId,
          user?.id ? { id: user.id, name: user.name ?? null } : null,
        );
        if (!pins || !pin || pins.some((p) => p.messageId === messageId)) return { rollback: () => undefined };
        queryClient.setQueryData<PinnedMessage[]>(key, [pin, ...pins]);
        return {
          rollback: () =>
            queryClient.setQueryData<PinnedMessage[]>(key, (current) => current?.filter((p) => p.id !== pin.id)),
        };
      },
      onError: (_error, _variables, context) => context?.rollback(),
      onSuccess: (_data, { channelId }) => {
        void queryClient.invalidateQueries({
          queryKey: collaborationQueryKeys.chat.pins(channelId),
          exact: true,
          refetchType: "none",
        });
      },
    },
  );
}

export function useUnpinMessage() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ ok: boolean }, Error, { channelId: number; messageId: number }, RollbackContext>(
    "chat:messages:pin",
    {
      mutationKey: ["chat", "messages", "unpin"],
      mutationFn: ({ channelId, messageId }) =>
        apiClient.delete<{ ok: boolean }>(
          `/chat/channels/${channelId}/pins/${messageId}`,
          undefined,
          undefined,
          chatOkContract,
        ),
      onMutate: async ({ channelId, messageId }) => {
        const key = collaborationQueryKeys.chat.pins(channelId);
        await cancelLoadedQueries(queryClient, [key]);
        const previous = queryClient.getQueryData<PinnedMessage[]>(key);
        if (!previous?.some((p) => p.messageId === messageId)) return { rollback: () => undefined };
        const stored = queryClient.setQueryData<PinnedMessage[]>(
          key,
          previous.filter((p) => p.messageId !== messageId),
        );
        return {
          rollback: () =>
            queryClient.setQueryData<PinnedMessage[]>(key, (current) => (current === stored ? previous : current)),
        };
      },
      onError: (_error, _variables, context) => context?.rollback(),
    },
  );
}

export function useThreadReplies(channelId: number, messageId: number) {
  const canRead = useCan("chat:messages:read");
  return useInfiniteQuery({
    ...INLINE_READ_ERROR,
    queryKey: collaborationQueryKeys.chat.thread(channelId, messageId),
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<ThreadPage>(
        `/chat/channels/${channelId}/messages/${messageId}/thread`,
        pageParam !== undefined ? { cursor: pageParam } : undefined,
        signal,
        chatThreadPageContract,
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: NO_ID_CURSOR_YET,
    staleTime: 15_000,
    enabled: canRead && channelId > 0 && messageId > 0,
  });
}

type ThreadReplyInput = { content?: string; attachments?: AttachmentInput[]; clientKey?: string };

export function useSendThreadReply(channelId: number, parentMessageId: number) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user;
  const threadKey = collaborationQueryKeys.chat.thread(channelId, parentMessageId);
  return useAuthorizedMutation<ChatSendResponse, Error, ThreadReplyInput, RollbackContext>("chat:messages:write", {
    ...chatSendRetry,
    mutationKey: ["chat", "thread", "reply"],
    // The thread POST answers the raw row (`chatRawMessageSchema`), not the joined
    // timeline shape, so it parses like the main send does.
    mutationFn: (body) =>
      apiClient.post<ChatSendResponse>(
        `/chat/channels/${channelId}/messages/${parentMessageId}/thread`,
        { ...body, clientKey: sendClientKey(body) },
        undefined,
        chatSendResponseContract,
      ),
    onMutate: async (body) => {
      await cancelLoadedQueries(queryClient, [threadKey]);
      const optimistic = optimisticMessage({
        ...body,
        channelId,
        clientKey: sendClientKey(body),
        author: user,
        replyToId: parentMessageId,
      });
      queryClient.setQueryData<InfiniteData<ThreadPage>>(threadKey, (old) => appendThreadReply(old, optimistic));
      return {
        rollback: () =>
          queryClient.setQueryData<InfiniteData<ThreadPage>>(threadKey, (old) =>
            removeThreadReply(old, optimistic.id),
          ),
      };
    },
    onError: (_error, _body, context) => context?.rollback(),
    onSuccess: (row, body) => {
      queryClient.setQueryData<InfiniteData<ThreadPage>>(threadKey, (old) =>
        reconcileThreadReply(old, sendClientKey(body), (optimistic) => reconcileSentMessage(optimistic, row)),
      );
    },
  });
}

export function useSearchMessages(query: string, enabled: boolean) {
  const canRead = useCan("chat:messages:read");
  return useQuery({
    queryKey: collaborationQueryKeys.chat.searchMessages(query),
    queryFn: ({ signal }) =>
      apiClient.get<SearchMessagesResult>("/chat/search/messages", { q: query }, signal, chatSearchMessagesContract),
    enabled: enabled && canRead && query.trim().length >= 2,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    throwOnError: false,
  });
}

export function useSearchChannels(query: string, enabled: boolean) {
  const canRead = useCan("chat:channels:read");
  return useQuery({
    queryKey: collaborationQueryKeys.chat.searchChannels(query),
    queryFn: ({ signal }) =>
      apiClient.get<SearchChannelResult[]>("/chat/search/channels", { q: query }, signal, chatSearchChannelsContract),
    enabled: enabled && canRead && query.trim().length >= 1,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    throwOnError: false,
  });
}

export function useSearchUsers(query: string, enabled: boolean) {
  const canRead = useCan("chat:channels:read");
  return useQuery({
    queryKey: collaborationQueryKeys.chat.searchUsers(query),
    queryFn: ({ signal }) =>
      apiClient.get<SearchUserResult[]>("/chat/search/users", { q: query }, signal, chatSearchUsersContract),
    enabled: enabled && canRead && query.trim().length >= 1,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    throwOnError: false,
  });
}

