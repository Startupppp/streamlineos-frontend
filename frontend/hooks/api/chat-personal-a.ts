"use client";

import {
  useQuery,
  useQueryClient,
  useInfiniteQuery,
  keepPreviousData,
  type InfiniteData,
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { reauthorizeAblyClients } from "@/lib/ably";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useRealtimePollInterval } from "@/hooks/common/use-realtime-poll-interval";
import type {
  Channel,
  ChatNotificationPreference,
  Message,
  MessagesPage,
  OnlineUser,
  OrgUser,
  CreateDMInput,
  CreateGroupChannelInput,
  CreatePublicChannelInput,
  CreatePrivateChannelInput,
  UpdateChannelInput,
  SendMessageInput,
  EditMessageInput,
  AttachmentInput,
  PinnedMessage,
  PublicChannel,
  ThreadPage,
  SearchMessagesResult,
  SearchChannelResult,
  SearchUserResult,
  SavedMessagesPage,
} from "@/types/chat";
import { refreshRealtimeCapability } from "./chat-shared";

export function useSavedMessages() {
  const canRead = useCan("chat:messages:read");
  return useInfiniteQuery({
    queryKey: queryKeys.chat.savedMessages(),
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<SavedMessagesPage>(
        "/chat/saved",
        pageParam ? { cursor: pageParam } : undefined, signal,
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
        queryKey: queryKeys.chat.savedMessages(),
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
        queryKey: queryKeys.chat.savedMessages(),
      });
    },
  });
}

