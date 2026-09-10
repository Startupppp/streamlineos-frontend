"use client";

import {
  useQuery,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  Channel,
  ChatNotificationPreference,
} from "@/types/chat";

export function useArchiveChannel() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "channels", "archive"],
    mutationFn: (channelId: number) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.archivedChannels(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.unreadTotal() });
    },
  });
}

export function useUnarchiveChannel() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "channels", "unarchive"],
    mutationFn: (channelId: number) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/unarchive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.archivedChannels(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.unreadTotal() });
    },
  });
}

export function useSetPresenceStatus() {
  return useAuthorizedMutation("chat:messages:write", {
    mutationKey: ["chat", "presence", "set-status"],
    mutationFn: (status: "ONLINE" | "AWAY" | "BUSY" | "INVISIBLE") =>
      apiClient.put<{ ok: boolean }>("/chat/presence/status", { status }),
  });
}

export function useMarkChannelUnread() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "channels", "mark-unread"],
    mutationFn: (channelId: number) =>
      apiClient.post<{ ok: boolean }>(
        `/chat/channels/${channelId}/mark-unread`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.unreadTotal() });
    },
  });
}

export function useEntityChannel(
  entityType: string | null,
  entityId: string | null,
) {
  return useQuery({
    queryKey: [...queryKeys.chat.all, "entity", entityType, entityId] as const,
    queryFn: () =>
      apiClient.get<Channel>(`/chat/channels/entity/${entityType}/${entityId}`),
    enabled: Boolean(entityType && entityId),
    staleTime: 5 * 60_000,
  });
}

export function useMuteChannel() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "channels", "mute"],
    mutationFn: ({
      channelId,
      duration,
    }: {
      channelId: number;
      duration: string;
    }) =>
      apiClient.post<{ ok: boolean; mutedUntil: string }>(
        `/chat/channels/${channelId}/mute`,
        { duration },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
    },
  });
}

export function useUnmuteChannel() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
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
  return useAuthorizedMutation("chat:channels:write", {
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
  return useAuthorizedMutation("chat:channels:write", {
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
    queryFn: () =>
      apiClient.post<{ token: string }>(
        `/chat/channels/${channelId}/invite-link`,
      ),
    enabled: enabled && channelId > 0,
    staleTime: 60_000,
  });
}

export function useRegenerateInviteLink() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:invite-links:manage", {
    mutationKey: ["chat", "channels", "invite-link", "regenerate"],
    mutationFn: (channelId: number) =>
      apiClient.post<{ token: string }>(
        `/chat/channels/${channelId}/invite-link/regenerate`,
      ),
    onSuccess: (_, channelId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.inviteLink(channelId),
      });
    },
  });
}

export function useJoinViaInviteLink() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "invite-links", "join"],
    mutationFn: (token: string) =>
      apiClient.post<{ ok: boolean; channelId: number }>(
        `/chat/invite-links/${token}/join`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
    },
  });
}

export function useSetNotificationPreference() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "channels", "notification-preference"],
    mutationFn: ({
      channelId,
      preference,
    }: {
      channelId: number;
      preference: ChatNotificationPreference;
    }) =>
      apiClient.post<{
        ok: boolean;
        notificationPreference: ChatNotificationPreference;
      }>(`/chat/channels/${channelId}/notification-preference`, { preference }),
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
  const canRead = useCan("chat:messages:read");
  return useInfiniteQuery({
    queryKey: [...queryKeys.chat.all, "channelFiles", channelId] as const,
    queryFn: ({ pageParam }) =>
      apiClient.get<{ files: ChannelFile[]; nextCursor?: number }>(
        `/chat/channels/${channelId}/files`,
        pageParam !== undefined ? { cursor: String(pageParam) } : undefined,
      ),
    getNextPageParam: (last) => last.nextCursor,
    initialPageParam: undefined as number | undefined,
    enabled: canRead && channelId > 0,
  });
}

