"use client";

import { useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
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
import type { SavedMessagesPage } from "@/types/chat";
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

export function useSaveMessage() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:messages:write", {
    mutationKey: ["chat", "messages", "save"],
    mutationFn: (messageId: number) =>
      apiClient.post<{ ok: boolean }>(`/chat/saved/${messageId}`, undefined, undefined, chatOkContract),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.savedMessages(),
      });
    },
  });
}

export function useUnsaveMessage() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:messages:write", {
    mutationKey: ["chat", "messages", "unsave"],
    mutationFn: (messageId: number) =>
      apiClient.delete<{ ok: boolean }>(`/chat/saved/${messageId}`, undefined, undefined, chatOkContract),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.savedMessages(),
      });
    },
  });
}

