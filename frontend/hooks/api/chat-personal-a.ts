"use client";

import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const chatOkContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatOkContract),
);
const chatSavedMessagesContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatSavedMessagesContract),
);
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { SavedMessage, SavedMessagesPage } from "@/types/chat";
import {
  cancelLoadedQueries,
  findCachedMessageAnywhere,
  mapPages,
  nextChatTempId,
  type ChatCacheRollback,
} from "@/hooks/api/chat-message-cache";
import { findChannelRow } from "@/hooks/api/chat-channel-cache";
import { NO_ID_CURSOR_YET } from "@/hooks/api/cursor-page-param";

export function useSavedMessages() {
  const canRead = useCan("chat:messages:read");
  return useInfiniteQuery({
    ...INLINE_READ_ERROR,
    queryKey: collaborationQueryKeys.chat.savedMessages(),
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<SavedMessagesPage>(
        "/chat/saved",
        pageParam !== undefined ? { cursor: pageParam } : undefined,
        signal,
        chatSavedMessagesContract,
      ),
    getNextPageParam: (last) => last.nextCursor,
    initialPageParam: NO_ID_CURSOR_YET,
    staleTime: 60_000,
    enabled: canRead,
  });
}

interface RollbackContext {
  rollback: ChatCacheRollback;
}

type SavedPages = InfiniteData<SavedMessagesPage>;

function savedItemFor(
  queryClient: QueryClient,
  messageId: number,
  orgId: string,
): SavedMessage | null {
  const message = findCachedMessageAnywhere(queryClient, messageId);
  if (!message) return null;
  const channel = findChannelRow(queryClient, message.channelId);
  const { sender } = message;
  return {
    id: nextChatTempId(),
    orgId,
    membershipId: 0,
    messageId,
    savedAt: new Date().toISOString(),
    message: {
      ...message,
      sender: sender.id === null ? null : { id: sender.id, name: sender.name, image: sender.image },
      channel: channel ? { id: channel.id, name: channel.name, type: channel.type } : null,
    },
  };
}

function removeSaved(
  queryClient: QueryClient,
  messageId: number,
): ChatCacheRollback {
  const key = collaborationQueryKeys.chat.savedMessages();
  const previous = queryClient.getQueryData<SavedPages>(key);
  const next = mapPages(previous, (page) =>
    page.items.some((item) => item.messageId === messageId)
      ? { ...page, items: page.items.filter((item) => item.messageId !== messageId) }
      : page,
  );
  if (!previous || next === previous) return () => undefined;
  const stored = queryClient.setQueryData<SavedPages>(key, next);
  return () => {
    queryClient.setQueryData<SavedPages>(key, (current) => (current === stored ? previous : current));
  };
}

function markSavedStale(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({
    queryKey: collaborationQueryKeys.chat.savedMessages(),
    exact: true,
    refetchType: "none",
  });
}

export function useSaveMessage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  return useAuthorizedMutation<{ ok: boolean }, Error, number, RollbackContext>("chat:messages:write", {
    mutationKey: ["chat", "messages", "save"],
    mutationFn: (messageId) =>
      apiClient.post<{ ok: boolean }>(`/chat/saved/${messageId}`, undefined, undefined, chatOkContract),
    onMutate: async (messageId) => {
      await cancelLoadedQueries(queryClient, [collaborationQueryKeys.chat.savedMessages()]);
      const key = collaborationQueryKeys.chat.savedMessages();
      const previous = queryClient.getQueryData<SavedPages>(key);
      const item = savedItemFor(queryClient, messageId, orgId);
      const alreadySaved = previous?.pages.some((page) => page.items.some((i) => i.messageId === messageId));
      if (!previous || previous.pages.length === 0 || !item || alreadySaved) return { rollback: () => undefined };
      const next: SavedPages = {
        ...previous,
        pages: previous.pages.map((page, index) =>
          index === 0 ? { ...page, items: [item, ...page.items] } : page,
        ),
      };
      queryClient.setQueryData<SavedPages>(key, next);
      return {
        rollback: () =>
          queryClient.setQueryData<SavedPages>(key, (current) =>
            mapPages(current, (page) =>
              page.items.some((i) => i.id === item.id)
                ? { ...page, items: page.items.filter((i) => i.id !== item.id) }
                : page,
            ),
          ),
      };
    },
    onError: (_error, _messageId, context) => context?.rollback(),
    onSuccess: () => markSavedStale(queryClient),
  });
}

export function useUnsaveMessage() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ ok: boolean }, Error, number, RollbackContext>("chat:messages:write", {
    mutationKey: ["chat", "messages", "unsave"],
    mutationFn: (messageId) =>
      apiClient.delete<{ ok: boolean }>(`/chat/saved/${messageId}`, undefined, undefined, chatOkContract),
    onMutate: async (messageId) => {
      await cancelLoadedQueries(queryClient, [collaborationQueryKeys.chat.savedMessages()]);
      return { rollback: removeSaved(queryClient, messageId) };
    },
    onError: (_error, _messageId, context) => context?.rollback(),
  });
}
