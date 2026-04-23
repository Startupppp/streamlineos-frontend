

"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  type InfiniteData,
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Channel,
  Message,
  MessagesPage,
  OnlineUser,
  OrgUser,
  TypingIndicator,
  CreateDMInput,
  CreateGroupChannelInput,
  UpdateChannelInput,
  SendMessageInput,
  EditMessageInput,
  MessageWithChannel,
} from "@/types/chat";

export function useChatChannels(enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.myChannels(),
    queryFn: () => apiClient.get<Channel[]>("/chat/channels"),
    refetchInterval: 30_000,
    enabled,
  });
}

export function useChatChannel(channelId: number) {
  return useQuery({
    queryKey: queryKeys.chat.channel(channelId),
    queryFn: () => apiClient.get<Channel>(`/chat/channels/${channelId}`),
    enabled: channelId > 0,
  });
}

export function useChatMessages(channelId: number) {
  return useInfiniteQuery({
    queryKey: queryKeys.chat.messages(channelId),
    queryFn: ({ pageParam }) =>
      apiClient.get<MessagesPage>(
        `/chat/channels/${channelId}/messages`,
        pageParam ? { cursor: pageParam } : undefined
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as number | undefined,
    enabled: channelId > 0,
  });
}

export function useChatPoll(channelId: number, since: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.chat.poll(channelId, since),
    queryFn: () =>
      apiClient.get<Message[]>(
        `/chat/channels/${channelId}/messages/poll`,
        { since }
      ),
    enabled: enabled && channelId > 0,
    refetchInterval: enabled ? 30_000 : false,
  });
}

export function useChatUnreadTotal(enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.unreadTotal(),
    queryFn: () => apiClient.get<{ total: number }>("/chat/unread"),
    refetchInterval: 30_000,
    enabled,
  });
}

export function useChatOnlineUsers(enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.onlineUsers(),
    queryFn: () => apiClient.get<OnlineUser[]>("/chat/presence/online"),
    refetchInterval: 30_000,
    staleTime: 10_000,
    enabled,
  });
}

export function useChatOrgUsers(enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.orgUsers(),
    queryFn: () => apiClient.get<OrgUser[]>("/chat/users"),
    enabled,
  });
}

export function useChatSearchMessages(query: string, channelId?: number) {
  return useQuery({
    queryKey: queryKeys.chat.search(query),
    queryFn: () =>
      apiClient.get<MessageWithChannel[]>("/chat/search", {
        query,
        ...(channelId ? { channelId } : {}),
      }),
    enabled: query.length >= 2,
  });
}

export function useChatTyping(channelId: number, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.chat.typing(channelId),
    queryFn: () =>
      apiClient.get<TypingIndicator[]>(`/chat/channels/${channelId}/typing`),
    refetchInterval: 4_000,
    enabled: enabled && channelId > 0,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  return useMutation({
    mutationFn: (input: SendMessageInput) =>
      apiClient.post<Message>(
        `/chat/channels/${input.channelId}/messages`,
        input
      ),
    onMutate: async (variables) => {

      await queryClient.cancelQueries({
        queryKey: queryKeys.chat.messages(variables.channelId),
      });

      const previousData = queryClient.getQueryData<InfiniteData<MessagesPage>>(
        queryKeys.chat.messages(variables.channelId)
      );

      const optimisticMsg: Message = {
        id: -Date.now(),
        channelId: variables.channelId,
        senderId: session?.user?.id ?? "__optimistic__",
        content: variables.content ?? null,
        replyToId: variables.replyToId ?? null,
        isEdited: false,
        isDeleted: false,
        messageType: "text",
        metadata: null,
        actionStatus: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sender: session?.user
          ? {
              id: session.user.id,
              name: session.user.name ?? null,
              image: session.user.image ?? null,
            }
          : null,
        attachments: [],
        replyTo: null,
      };

      if (previousData) {
        const pages = previousData.pages.map((page, i) =>
          i === previousData.pages.length - 1
            ? { ...page, messages: [...page.messages, optimisticMsg] }
            : page
        );
        queryClient.setQueryData<InfiniteData<MessagesPage>>(
          queryKeys.chat.messages(variables.channelId),
          { ...previousData, pages }
        );
      }

      return { previousData };
    },
    onError: (_err, variables, context) => {

      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.chat.messages(variables.channelId),
          context.previousData
        );
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.messages(variables.channelId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
    },
  });
}

export function useEditMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, messageId, content }: EditMessageInput & { channelId: number }) =>
      apiClient.patch<{ ok: boolean }>(
        `/chat/channels/${channelId}/messages/${messageId}`,
        { content }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.all });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, messageId }: { channelId: number; messageId: number }) =>
      apiClient.delete<{ ok: boolean }>(
        `/chat/channels/${channelId}/messages/${messageId}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.all });
    },
  });
}

export function useMarkChannelRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId }: { channelId: number }) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.unreadTotal() });
    },
  });
}

export function useCreateDMChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDMInput) =>
      apiClient.post<Channel>("/chat/channels", { type: "DIRECT", ...input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
    },
  });
}

export function useCreateGroupChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGroupChannelInput) =>
      apiClient.post<Channel>("/chat/channels", { type: "GROUP", ...input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
    },
  });
}

export function useUpdateChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      channelId,
      ...update
    }: UpdateChannelInput & { channelId: number }) =>
      apiClient.patch<{ ok: boolean }>(`/chat/channels/${channelId}`, update),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.channel(variables.channelId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
    },
  });
}

export function useAddChannelMembers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      channelId,
      userIds,
    }: {
      channelId: number;
      userIds: string[];
    }) =>
      apiClient.post<{ added: number; skipped: number }>(
        `/chat/channels/${channelId}/members`,
        { userIds }
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.channel(variables.channelId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
    },
  });
}

export function useRemoveChannelMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      channelId,
      userId,
    }: {
      channelId: number;
      userId: string;
    }) =>
      apiClient.delete<{ removed: boolean }>(
        `/chat/channels/${channelId}/members/${userId}`
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.channel(variables.channelId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
    },
  });
}

export function useLeaveChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (channelId: number) =>
      apiClient.delete<{ left: boolean }>(`/chat/channels/${channelId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
    },
  });
}

export function useChatHeartbeat() {
  return useMutation({
    mutationFn: () =>
      apiClient.post<{ ok: boolean }>("/chat/presence/heartbeat"),
  });
}

export function useSetTyping() {
  return useMutation({
    mutationFn: ({ channelId }: { channelId: number }) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/typing`),
  });
}

export function useCreatePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { channelId: number; question: string; options: string[]; endsAt?: string }) =>
      apiClient.post<Message>(`/chat/channels/${input.channelId}/polls`, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.messages(variables.channelId),
      });
    },
  });
}

export function useVotePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { pollId: number; optionId: number; channelId: number }) =>
      apiClient.post<{ ok: boolean }>(`/chat/polls/${input.pollId}/vote`, {
        optionId: input.optionId,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.messages(variables.channelId),
      });
    },
  });
}

export const useMarkRead = useMarkChannelRead;

export const useCreateDM = useCreateDMChannel;

export const useChatSearch = useChatSearchMessages;

export function useToggleReaction(channelId: number, messageId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ emoji }: { emoji: string }) =>
      apiClient.post<{ reactions: Record<string, string[]> }>(
        `/chat/channels/${channelId}/messages/${messageId}/reactions`,
        { emoji }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.messages(channelId),
      });
    },
  });
}

export function useUpdatePresenceStatus() {
  return useMutation({
    mutationFn: ({ status }: { status: "ONLINE" | "AWAY" | "OFFLINE" }) =>
      apiClient.put<{ ok: boolean }>("/chat/status", { status }),
  });
}
