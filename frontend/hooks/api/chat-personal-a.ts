"use client";

import { useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { SavedMessagesPage } from "@/types/chat";

export function useSavedMessages() {
  const canRead = useCan("chat:messages:read");
  return useInfiniteQuery({
    queryKey: collaborationQueryKeys.chat.savedMessages(),
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<SavedMessagesPage>(
        "/chat/saved",
        pageParam !== undefined ? { cursor: pageParam } : undefined, signal,
      ),
    getNextPageParam: (last) => last.nextCursor,
    initialPageParam: undefined as number | undefined,
    staleTime: 60_000,
    enabled: canRead,
  });
}

export function useSaveMessage() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:messages:write", {
    mutationKey: ["chat", "messages", "save"],
    mutationFn: (messageId: number) =>
      apiClient.post<{ ok: boolean }>(`/chat/saved/${messageId}`),
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
      apiClient.delete<{ ok: boolean }>(`/chat/saved/${messageId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.savedMessages(),
      });
    },
  });
}

