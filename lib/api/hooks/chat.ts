/**
 * Chat domain — TanStack Query hooks (Axios-backed, zero tRPC).
 *
 * Hook names are identical to the old lib/hooks/chat-hooks.ts so that
 * consumers can swap the import path without any further changes.
 */

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

// ─── Channel queries ──────────────────────────────────────────────────────────

/** Returns the authenticated user's channel list, refreshed every 30 s. */
export function useChatChannels(enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.myChannels(),
    queryFn: () => apiClient.get<Channel[]>("/chat/channels"),
    refetchInterval: 30_000,
    enabled,
  });
}

/** Returns a single channel by id (user must be a member). */
export function useChatChannel(channelId: number) {
  return useQuery({
    queryKey: queryKeys.chat.channel(channelId),
    queryFn: () => apiClient.get<Channel>(`/chat/channels/${channelId}`),
    enabled: channelId > 0,
  });
}

/**
 * Cursor-based infinite list of messages (oldest-first).
 * Pages are fetched backwards: pass `cursor` = previous page's nextCursor.
 */
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

/**
 * Fallback polling hook: fetches new messages since a given ISO timestamp.
 * Refetches every 30 s — used only when the Ably WebSocket connection is
 * unavailable (e.g. ABLY_API_KEY not set, network issues, etc.).
 */
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

// ─── Presence queries ─────────────────────────────────────────────────────────

/** Returns total unread count across all channels, refreshed every 30 s. */
export function useChatUnreadTotal(enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.unreadTotal(),
    queryFn: () => apiClient.get<{ total: number }>("/chat/unread"),
    refetchInterval: 30_000,
    enabled,
  });
}

/** Returns online users in the org, refreshed every 30 s. */
export function useChatOnlineUsers(enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.onlineUsers(),
    queryFn: () => apiClient.get<OnlineUser[]>("/chat/presence/online"),
    refetchInterval: 30_000,
    staleTime: 10_000,
    enabled,
  });
}

/** Returns active org members available to DM (excludes self). */
export function useChatOrgUsers(enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.orgUsers(),
    queryFn: () => apiClient.get<OrgUser[]>("/chat/users"),
    enabled,
  });
}

// ─── Search query ─────────────────────────────────────────────────────────────

/** Full-text message search; only fires when query length >= 2. */
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

// ─── Typing query ─────────────────────────────────────────────────────────────

/** Returns who is currently typing in a channel, polled every 4 s. */
export function useChatTyping(channelId: number, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.chat.typing(channelId),
    queryFn: () =>
      apiClient.get<TypingIndicator[]>(`/chat/channels/${channelId}/typing`),
    refetchInterval: 4_000,
    enabled: enabled && channelId > 0,
  });
}

// ─── Message mutations ────────────────────────────────────────────────────────

/** Sends a new message with optimistic update for instant UI feedback. */
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
      // Cancel in-flight refetches to avoid race conditions
      await queryClient.cancelQueries({
        queryKey: queryKeys.chat.messages(variables.channelId),
      });

      // Snapshot current data for rollback on error
      const previousData = queryClient.getQueryData<InfiniteData<MessagesPage>>(
        queryKeys.chat.messages(variables.channelId)
      );

      // Build an optimistic message shown immediately
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
      // Roll back optimistic update on failure
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

/** Edits an existing message's content. Invalidates all chat queries on success. */
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

/** Soft-deletes a message. Invalidates all chat queries on success. */
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

// ─── Read / mark-read mutation ────────────────────────────────────────────────

/** Marks a channel as read. Invalidates channel list and unread total. */
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

// ─── Channel mutations ────────────────────────────────────────────────────────

/** Creates a DM channel with another user (returns existing channel if one exists). */
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

/** Creates a new group channel. */
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

/** Updates channel metadata (name / description / avatar). Caller must be ADMIN. */
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

// ─── Presence mutations ───────────────────────────────────────────────────────

/** Sends a heartbeat to keep the user's presence as ONLINE. */
export function useChatHeartbeat() {
  return useMutation({
    mutationFn: () =>
      apiClient.post<{ ok: boolean }>("/chat/presence/heartbeat"),
  });
}

/** Sets the current user as typing in a channel. */
export function useSetTyping() {
  return useMutation({
    mutationFn: ({ channelId }: { channelId: number }) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/typing`),
  });
}

// ─── Poll / voting mutations (stubs — Poll feature not yet shipped) ────────────

/**
 * Creates a poll message in a channel.
 * Route handler not yet implemented — placeholder for future use.
 */
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

/**
 * Submits a vote on a poll option.
 * Route handler not yet implemented — placeholder for future use.
 */
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

// ─── Backward-compatibility aliases ───────────────────────────────────────────

/** Alias for useMarkChannelRead — kept for backward compatibility. */
export const useMarkRead = useMarkChannelRead;

/** Alias for useCreateDMChannel — kept for backward compatibility. */
export const useCreateDM = useCreateDMChannel;

/** Alias for useChatSearchMessages — kept for backward compatibility. */
export const useChatSearch = useChatSearchMessages;
