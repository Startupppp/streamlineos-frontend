

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
  ChatNotificationPreference,
  ChatOrgSettings,
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

export function useChatChannels(enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.myChannels(),
    queryFn: () => apiClient.get<Channel[]>("/chat/channels"),
    staleTime: 2 * 60_000,
    enabled,
  });
}

export function useArchivedChannels(enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.archivedChannels(),
    queryFn: () => apiClient.get<Channel[]>("/chat/channels/archived"),
    staleTime: 2 * 60_000,
    enabled,
  });
}

export function usePublicChannels(enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.publicChannels(),
    queryFn: () => apiClient.get<PublicChannel[]>("/chat/channels/public"),
    staleTime: 2 * 60_000,
    enabled,
  });
}

export function useChatChannel(channelId: number) {
  return useQuery({
    queryKey: queryKeys.chat.channel(channelId),
    queryFn: () => apiClient.get<Channel>(`/chat/channels/${channelId}`),
    staleTime: 2 * 60_000,
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
    staleTime: 2 * 60_000,
    enabled: enabled && channelId > 0,
    refetchInterval: enabled ? 30_000 : false,
  });
}

export function useChatUnreadTotal(enabled = true) {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  return useQuery({
    queryKey: queryKeys.chat.unreadTotal(),
    queryFn: () => apiClient.get<{ total: number }>("/chat/unread"),
    staleTime: 2 * 60_000,
    enabled: !!orgId && enabled,
  });
}

export function useChatOnlineUsers(enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.onlineUsers(),
    queryFn: () => apiClient.get<OnlineUser[]>("/chat/presence/online"),
    refetchInterval: 60_000,
    staleTime: 30_000,
    enabled,
  });
}

export function useChatOrgUsers(enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.orgUsers(),
    queryFn: () => apiClient.get<OrgUser[]>("/chat/users"),
    staleTime: 2 * 60_000,
    enabled,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  return useMutation({
    mutationKey: ["chat", "messages", "send"],
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
        metadata: variables.metadata ?? null,
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
    mutationKey: ["chat", "messages", "edit"],
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
    mutationKey: ["chat", "messages", "delete"],
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
    mutationKey: ["chat", "channels", "mark-read"],
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
    mutationKey: ["chat", "channels", "create-dm"],
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
    mutationKey: ["chat", "channels", "create-group"],
    mutationFn: (input: CreateGroupChannelInput) =>
      apiClient.post<Channel>("/chat/channels", { type: "GROUP", ...input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
    },
  });
}

export function useCreatePublicChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["chat", "channels", "create-public"],
    mutationFn: (input: CreatePublicChannelInput) =>
      apiClient.post<Channel>("/chat/channels", { type: "PUBLIC", ...input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.publicChannels() });
    },
  });
}

export function useCreatePrivateChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["chat", "channels", "create-private"],
    mutationFn: (input: CreatePrivateChannelInput) =>
      apiClient.post<Channel>("/chat/channels", { type: "PRIVATE", ...input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
    },
  });
}

export function useJoinChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["chat", "channels", "join"],
    mutationFn: (channelId: number) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/join`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.publicChannels() });
    },
  });
}

export function useLeaveChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["chat", "channels", "leave"],
    mutationFn: (channelId: number) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/leave`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.publicChannels() });
    },
  });
}

export function useAddChannelMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["chat", "channels", "add-member"],
    mutationFn: ({ channelId, userId }: { channelId: number; userId: string }) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/members`, { userId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.channel(variables.channelId) });
    },
  });
}

export function useRemoveChannelMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["chat", "channels", "remove-member"],
    mutationFn: ({ channelId, userId }: { channelId: number; userId: string }) =>
      apiClient.delete<{ ok: boolean }>(`/chat/channels/${channelId}/members/${userId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.channel(variables.channelId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
    },
  });
}

export function useUpdateChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["chat", "channels", "update"],
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

export function useChatHeartbeat() {
  return useMutation({
    mutationKey: ["chat", "presence", "heartbeat"],
    mutationFn: () =>
      apiClient.post<{ ok: boolean }>("/chat/presence/heartbeat"),
  });
}

export function useToggleReaction(channelId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["chat", "messages", "toggle-reaction"],
    mutationFn: ({ messageId, emoji }: { messageId: number; emoji: string }) =>
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

export function useChatPins(channelId: number) {
  return useQuery({
    queryKey: queryKeys.chat.pins(channelId),
    queryFn: () => apiClient.get<PinnedMessage[]>(`/chat/channels/${channelId}/pins`),
    staleTime: 2 * 60_000,
    enabled: channelId > 0,
  });
}

export function usePinMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["chat", "messages", "pin"],
    mutationFn: ({ channelId, messageId }: { channelId: number; messageId: number }) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/pins`, { messageId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.pins(variables.channelId) });
    },
  });
}

export function useUnpinMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["chat", "messages", "unpin"],
    mutationFn: ({ channelId, messageId }: { channelId: number; messageId: number }) =>
      apiClient.delete<{ ok: boolean }>(`/chat/channels/${channelId}/pins/${messageId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.pins(variables.channelId) });
    },
  });
}

export function useThreadReplies(channelId: number, messageId: number) {
  return useInfiniteQuery({
    queryKey: queryKeys.chat.thread(channelId, messageId),
    queryFn: ({ pageParam }) =>
      apiClient.get<ThreadPage>(
        `/chat/channels/${channelId}/messages/${messageId}/thread`,
        pageParam ? { cursor: pageParam } : undefined,
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as number | undefined,
    enabled: channelId > 0 && messageId > 0,
  });
}

export function useSendThreadReply(channelId: number, parentMessageId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["chat", "thread", "reply"],
    mutationFn: (body: { content?: string; attachments?: AttachmentInput[] }) =>
      apiClient.post<Message>(
        `/chat/channels/${channelId}/messages/${parentMessageId}/thread`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.thread(channelId, parentMessageId),
      });
    },
  });
}

export function useSearchMessages(query: string, enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.chat.all, "search", "messages", query] as const,
    queryFn: () => apiClient.get<SearchMessagesResult>("/chat/search/messages", { q: query }),
    enabled: enabled && query.trim().length >= 2,
    staleTime: 30_000,
  });
}

export function useSearchChannels(query: string, enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.chat.all, "search", "channels", query] as const,
    queryFn: () => apiClient.get<SearchChannelResult[]>("/chat/search/channels", { q: query }),
    enabled: enabled && query.trim().length >= 1,
    staleTime: 30_000,
  });
}

export function useSearchUsers(query: string, enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.chat.all, "search", "users", query] as const,
    queryFn: () => apiClient.get<SearchUserResult[]>("/chat/search/users", { q: query }),
    enabled: enabled && query.trim().length >= 1,
    staleTime: 30_000,
  });
}

export function useSavedMessages() {
  return useInfiniteQuery({
    queryKey: queryKeys.chat.savedMessages(),
    queryFn: ({ pageParam }) =>
      apiClient.get<SavedMessagesPage>("/chat/saved", pageParam ? { cursor: pageParam } : undefined),
    getNextPageParam: (last) => last.nextCursor,
    initialPageParam: undefined as number | undefined,
    staleTime: 60_000,
  });
}

export function useSaveMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["chat", "messages", "save"],
    mutationFn: (messageId: number) => apiClient.post<{ ok: boolean }>(`/chat/saved/${messageId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.chat.savedMessages() }); },
  });
}

export function useUnsaveMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["chat", "messages", "unsave"],
    mutationFn: (messageId: number) => apiClient.delete<{ ok: boolean }>(`/chat/saved/${messageId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.chat.savedMessages() }); },
  });
}

export function useArchiveChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["chat", "channels", "archive"],
    mutationFn: (channelId: number) => apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.archivedChannels() });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.unreadTotal() });
    },
  });
}

export function useUnarchiveChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["chat", "channels", "unarchive"],
    mutationFn: (channelId: number) => apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/unarchive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.archivedChannels() });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.unreadTotal() });
    },
  });
}

export function useSetPresenceStatus() {
  return useMutation({
    mutationKey: ["chat", "presence", "set-status"],
    mutationFn: (status: "ONLINE" | "AWAY" | "BUSY" | "INVISIBLE") =>
      apiClient.put<{ ok: boolean }>("/chat/presence/status", { status }),
  });
}

export function useMarkChannelUnread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["chat", "channels", "mark-unread"],
    mutationFn: (channelId: number) => apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/mark-unread`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.unreadTotal() });
    },
  });
}

export function useEntityChannel(entityType: string | null, entityId: string | null) {
  return useQuery({
    queryKey: [...queryKeys.chat.all, "entity", entityType, entityId] as const,
    queryFn: () => apiClient.get<Channel>(`/chat/channels/entity/${entityType}/${entityId}`),
    enabled: Boolean(entityType && entityId),
    staleTime: 5 * 60_000,
  });
}

export function useMuteChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["chat", "channels", "mute"],
    mutationFn: ({ channelId, duration }: { channelId: number; duration: string }) =>
      apiClient.post<{ ok: boolean; mutedUntil: string }>(`/chat/channels/${channelId}/mute`, { duration }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
    },
  });
}

export function useUnmuteChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["chat", "channels", "unmute"],
    mutationFn: (channelId: number) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/unmute`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
    },
  });
}

export function useFavoriteChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["chat", "channels", "favorite"],
    mutationFn: (channelId: number) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/favorite`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
    },
  });
}

export function useUnfavoriteChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["chat", "channels", "unfavorite"],
    mutationFn: (channelId: number) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/unfavorite`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
    },
  });
}

export function useChannelInviteLink(channelId: number, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.chat.inviteLink(channelId),
    queryFn: () => apiClient.post<{ token: string }>(`/chat/channels/${channelId}/invite-link`),
    enabled: enabled && channelId > 0,
    staleTime: 60_000,
  });
}

export function useRegenerateInviteLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["chat", "channels", "invite-link", "regenerate"],
    mutationFn: (channelId: number) =>
      apiClient.post<{ token: string }>(`/chat/channels/${channelId}/invite-link/regenerate`),
    onSuccess: (_data, channelId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.inviteLink(channelId) });
    },
  });
}

export function useChatOrgSettings() {
  return useQuery({
    queryKey: queryKeys.chat.orgSettings(),
    queryFn: () => apiClient.get<ChatOrgSettings>("/chat/settings"),
    staleTime: 60_000,
  });
}

export function useUpdateChatOrgSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["chat", "settings", "update"],
    mutationFn: (patch: Partial<ChatOrgSettings>) =>
      apiClient.patch<ChatOrgSettings>("/chat/settings", patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.orgSettings() });
    },
  });
}

export function useJoinViaInviteLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["chat", "invite-links", "join"],
    mutationFn: (token: string) =>
      apiClient.post<{ ok: boolean; channelId: number }>(`/chat/invite-links/${token}/join`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
    },
  });
}

export function useSetNotificationPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["chat", "channels", "notification-preference"],
    mutationFn: ({
      channelId,
      preference,
    }: {
      channelId: number;
      preference: ChatNotificationPreference;
    }) =>
      apiClient.post<{ ok: boolean; notificationPreference: ChatNotificationPreference }>(
        `/chat/channels/${channelId}/notification-preference`,
        { preference },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
    },
  });
}

export interface ChannelFile {
  id: number;
  messageId: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileUrl: string;
}

export function useChannelFiles(channelId: number) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.chat.all, "channelFiles", channelId] as const,
    queryFn: ({ pageParam }) =>
      apiClient.get<{ files: ChannelFile[]; nextCursor?: number }>(
        `/chat/channels/${channelId}/files`,
        pageParam !== undefined ? { cursor: String(pageParam) } : undefined,
      ),
    getNextPageParam: (last) => last.nextCursor,
    initialPageParam: undefined as number | undefined,
    enabled: channelId > 0,
  });
}

interface LinkMeta {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

export function useLinkPreview(url: string | null) {
  return useQuery({
    queryKey: [...queryKeys.chat.all, "linkPreview", url] as const,
    queryFn: () => apiClient.get<LinkMeta>("/chat/link-preview", { url: url! }),
    enabled: Boolean(url) && url!.startsWith("http"),
    staleTime: 10 * 60_000,
    retry: false,
  });
}

export interface CreateTaskFromMessageInput {
  channelId: number;
  messageId: number;
  projectId: number;
  type: "TASK" | "BUG";
  title?: string;
}

export function useCreateTaskFromMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["chat", "actions", "create-task-from-message"],
    mutationFn: (input: CreateTaskFromMessageInput) =>
      apiClient.post<{ ticketId: number; ticketNumber: number }>(
        "/chat/actions/create-task-from-message",
        input,
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.messages(variables.channelId),
      });
    },
  });
}
