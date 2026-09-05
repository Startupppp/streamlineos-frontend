"use client";

import {
  useQuery,
  useQueryClient,
  useInfiniteQuery,
  keepPreviousData,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  Message,
  AttachmentInput,
  PinnedMessage,
  ThreadPage,
  SearchMessagesResult,
  SearchChannelResult,
  SearchUserResult,
} from "@/types/chat";

export function useChatPins(channelId: number) {
  const canRead = useCan("chat:messages:read");
  return useQuery({
    queryKey: collaborationQueryKeys.chat.pins(channelId),
    queryFn: ({ signal }) =>
      apiClient.get<PinnedMessage[]>(`/chat/channels/${channelId}/pins`, undefined, signal),
    staleTime: 2 * 60_000,
    enabled: canRead && channelId > 0,
  });
}

export function usePinMessage() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:messages:pin", {
    mutationKey: ["chat", "messages", "pin"],
    mutationFn: ({
      channelId,
      messageId,
    }: {
      channelId: number;
      messageId: number;
    }) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/pins`, {
        messageId,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.pins(variables.channelId),
      });
    },
  });
}

export function useUnpinMessage() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:messages:pin", {
    mutationKey: ["chat", "messages", "unpin"],
    mutationFn: ({
      channelId,
      messageId,
    }: {
      channelId: number;
      messageId: number;
    }) =>
      apiClient.delete<{ ok: boolean }>(
        `/chat/channels/${channelId}/pins/${messageId}`,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.pins(variables.channelId),
      });
    },
  });
}

export function useThreadReplies(channelId: number, messageId: number) {
  const canRead = useCan("chat:messages:read");
  return useInfiniteQuery({
    queryKey: collaborationQueryKeys.chat.thread(channelId, messageId),
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<ThreadPage>(
        `/chat/channels/${channelId}/messages/${messageId}/thread`,
        pageParam !== undefined ? { cursor: pageParam } : undefined, signal,
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as number | undefined,
    enabled: canRead && channelId > 0 && messageId > 0,
  });
}

export function useSendThreadReply(channelId: number, parentMessageId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:messages:write", {
    mutationKey: ["chat", "thread", "reply"],
    mutationFn: (body: { content?: string; attachments?: AttachmentInput[] }) =>
      apiClient.post<Message>(
        `/chat/channels/${channelId}/messages/${parentMessageId}/thread`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.thread(channelId, parentMessageId),
      });
    },
  });
}

export function useSearchMessages(query: string, enabled: boolean) {
  const canRead = useCan("chat:messages:read");
  return useQuery({
    queryKey: [...collaborationQueryKeys.chat.all, "search", "messages", query] as const,
    queryFn: ({ signal }) =>
      apiClient.get<SearchMessagesResult>("/chat/search/messages", {
        q: query,
      }, signal),
    enabled: enabled && canRead && query.trim().length >= 2,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useSearchChannels(query: string, enabled: boolean) {
  const canRead = useCan("chat:channels:read");
  return useQuery({
    queryKey: [...collaborationQueryKeys.chat.all, "search", "channels", query] as const,
    queryFn: ({ signal }) =>
      apiClient.get<SearchChannelResult[]>("/chat/search/channels", {
        q: query,
      }, signal),
    enabled: enabled && canRead && query.trim().length >= 1,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useSearchUsers(query: string, enabled: boolean) {
  const canRead = useCan("chat:channels:read");
  return useQuery({
    queryKey: [...collaborationQueryKeys.chat.all, "search", "users", query] as const,
    queryFn: ({ signal }) =>
      apiClient.get<SearchUserResult[]>("/chat/search/users", { q: query }, signal),
    enabled: enabled && canRead && query.trim().length >= 1,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

