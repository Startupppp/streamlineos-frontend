import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { vaivammTrpcClient } from "../trpc";
import { vaivammKeys } from "./trpc-keys";

export function useChatChannels(enabled = true) {
  return useQuery({
    queryKey: vaivammKeys.chat.myChannels(),
    queryFn: () => vaivammTrpcClient.chat.channel.getMyChannels.query(),
    refetchInterval: 30_000,
    enabled,
  });
}

export function useChatChannel(channelId: number) {
  return useQuery({
    queryKey: vaivammKeys.chat.channel(channelId),
    queryFn: () => vaivammTrpcClient.chat.channel.getChannel.query({ channelId }),
    enabled: channelId > 0,
  });
}

export function useChatMessages(channelId: number) {
  return useInfiniteQuery({
    queryKey: vaivammKeys.chat.messages(channelId),
    queryFn: ({ pageParam }) =>
      vaivammTrpcClient.chat.message.getMessages.query({
        channelId,
        cursor: pageParam as number | undefined,
        limit: 50,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as number | undefined,
    enabled: channelId > 0,
  });
}

export function useChatPoll(channelId: number, since: string, enabled: boolean) {
  return useQuery({
    queryKey: vaivammKeys.chat.poll(channelId, since),
    queryFn: () => vaivammTrpcClient.chat.message.poll.query({ channelId, since }),
    refetchInterval: 5_000,
    enabled: enabled && channelId > 0,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof vaivammTrpcClient.chat.message.send.mutate>[0]) =>
      vaivammTrpcClient.chat.message.send.mutate(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.chat.messages(variables.channelId) });
      queryClient.invalidateQueries({ queryKey: vaivammKeys.chat.myChannels() });
    },
  });
}

export function useEditMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof vaivammTrpcClient.chat.message.edit.mutate>[0]) =>
      vaivammTrpcClient.chat.message.edit.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.chat.all });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof vaivammTrpcClient.chat.message.delete.mutate>[0]) =>
      vaivammTrpcClient.chat.message.delete.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.chat.all });
    },
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { channelId: number }) =>
      vaivammTrpcClient.chat.message.markRead.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.chat.myChannels() });
      queryClient.invalidateQueries({ queryKey: vaivammKeys.chat.unreadTotal() });
    },
  });
}

export function useCreateDM() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { targetUserId: string }) =>
      vaivammTrpcClient.chat.channel.createDM.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.chat.myChannels() });
    },
  });
}

export function useCreateGroupChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof vaivammTrpcClient.chat.channel.createGroup.mutate>[0]) =>
      vaivammTrpcClient.chat.channel.createGroup.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.chat.myChannels() });
    },
  });
}

export function useUpdateChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { channelId: number; name?: string; description?: string; avatarUrl?: string }) =>
      vaivammTrpcClient.chat.channel.updateChannel.mutate(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: vaivammKeys.chat.channel(variables.channelId) });
      queryClient.invalidateQueries({ queryKey: vaivammKeys.chat.myChannels() });
    },
  });
}

export function useChatUnreadTotal() {
  return useQuery({
    queryKey: vaivammKeys.chat.unreadTotal(),
    queryFn: () => vaivammTrpcClient.chat.channel.getUnreadTotal.query(),
    refetchInterval: 15_000,
  });
}

export function useChatOnlineUsers() {
  return useQuery({
    queryKey: vaivammKeys.chat.onlineUsers(),
    queryFn: () => vaivammTrpcClient.chat.presence.getOnlineUsers.query(),
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

export function useChatHeartbeat() {
  return useMutation({
    mutationFn: () => vaivammTrpcClient.chat.presence.heartbeat.mutate(),
  });
}

export function useChatOrgUsers() {
  return useQuery({
    queryKey: vaivammKeys.chat.orgUsers(),
    queryFn: () => vaivammTrpcClient.chat.channel.getOrgUsers.query(),
  });
}

export function useChatSearch(query: string) {
  return useQuery({
    queryKey: vaivammKeys.chat.search(query),
    queryFn: () => vaivammTrpcClient.chat.message.search.query({ query }),
    enabled: query.length >= 2,
  });
}

export function useSetTyping() {
  return useMutation({
    mutationFn: (input: { channelId: number }) =>
      vaivammTrpcClient.chat.presence.setTyping.mutate(input),
  });
}

export function useChatTyping(channelId: number, enabled: boolean) {
  return useQuery({
    queryKey: vaivammKeys.chat.typing(channelId),
    queryFn: () => vaivammTrpcClient.chat.presence.getTyping.query({ channelId }),
    refetchInterval: 4_000,
    enabled: enabled && channelId > 0,
  });
}
