"use client";

import { useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const chatOkContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatOkContract),
);
const chatChannelDetailContract = lazyContract(() =>
  import("@/hooks/api/chat-extra-schema").then((m) => m.chatChannelDetailContract),
);
const chatMuteResponseContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatMuteResponseContract),
);
const chatInviteLinkContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatInviteLinkContract),
);
const chatJoinViaInviteContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatJoinViaInviteContract),
);
const chatNotifPrefResponseContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatNotifPrefResponseContract),
);
const chatChannelFilesContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatChannelFilesContract),
);
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { Channel, ChatNotificationPreference } from "@/types/chat";
import { NO_ID_CURSOR_YET } from "@/hooks/api/cursor-page-param";

export function useArchiveChannel() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "channels", "archive"],
    mutationFn: (channelId: number) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/archive`, undefined, undefined, chatOkContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.myChannels() });
      queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.archivedChannels(),
      });
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.unreadTotal() });
    },
  });
}

export function useUnarchiveChannel() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "channels", "unarchive"],
    mutationFn: (channelId: number) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/unarchive`, undefined, undefined, chatOkContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.myChannels() });
      queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.archivedChannels(),
      });
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.unreadTotal() });
    },
  });
}

export function useMarkChannelUnread() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:messages:write", {
    mutationKey: ["chat", "channels", "mark-unread"],
    mutationFn: (channelId: number) =>
      apiClient.post<{ ok: boolean }>(
        `/chat/channels/${channelId}/mark-unread`,
        undefined,
        undefined,
        chatOkContract,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.myChannels() });
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.unreadTotal() });
    },
  });
}

export function useEntityChannel(
  entityType: string | null,
  entityId: string | null,
) {
  const canRead = useCan("chat:channels:read");
  return useQuery({
    queryKey: [...collaborationQueryKeys.chat.all, "entity", entityType, entityId] as const,
    queryFn: ({ signal }) =>
      apiClient.get<Channel>(`/chat/channels/entity/${entityType}/${entityId}`, undefined, signal, chatChannelDetailContract),
    enabled: canRead && Boolean(entityType && entityId),
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
        undefined,
        chatMuteResponseContract,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.myChannels() });
    },
  });
}

export function useUnmuteChannel() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "channels", "unmute"],
    mutationFn: (channelId: number) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/unmute`, undefined, undefined, chatOkContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.myChannels() });
    },
  });
}

export function useFavoriteChannel() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "channels", "favorite"],
    mutationFn: (channelId: number) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/favorite`, undefined, undefined, chatOkContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.myChannels() });
    },
  });
}

export function useUnfavoriteChannel() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "channels", "unfavorite"],
    mutationFn: (channelId: number) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/unfavorite`, undefined, undefined, chatOkContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.myChannels() });
    },
  });
}

export function useChannelInviteLink(channelId: number, enabled: boolean) {
  const canManage = useCan("chat:invite-links:manage");
  return useQuery({
    queryKey: collaborationQueryKeys.chat.inviteLink(channelId),
    queryFn: ({ signal }) =>
      apiClient.post<{ token: string }>(
        `/chat/channels/${channelId}/invite-link`,
        undefined,
        { signal },
        chatInviteLinkContract,
      ),
    enabled: canManage && enabled && channelId > 0,
    staleTime: 60_000,
  });
}

export interface RegenerateInviteLinkInput {
  channelId: number;
  ttlSeconds?: number;
  maxUses?: number;
}

export function useRegenerateInviteLink() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ token: string }, Error, RegenerateInviteLinkInput>(
    "chat:invite-links:manage",
    {
      mutationKey: ["chat", "channels", "invite-link", "regenerate"],
      mutationFn: ({ channelId, ttlSeconds, maxUses }) =>
        apiClient.post<{ token: string }>(
          `/chat/channels/${channelId}/invite-link/regenerate`,
          { ...(ttlSeconds !== undefined && { ttlSeconds }), ...(maxUses !== undefined && { maxUses }) },
          undefined,
          chatInviteLinkContract,
        ),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: collaborationQueryKeys.chat.inviteLink(variables.channelId),
        });
      },
    },
  );
}

export function useJoinViaInviteLink() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "invite-links", "join"],
    mutationFn: (token: string) =>
      apiClient.post<{ ok: boolean; channelId: number }>(
        `/chat/invite-links/${token}/join`,
        undefined,
        undefined,
        chatJoinViaInviteContract,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.myChannels() });
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
      }>(
        `/chat/channels/${channelId}/notification-preference`,
        { preference },
        undefined,
        chatNotifPrefResponseContract,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.myChannels() });
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
    queryKey: [...collaborationQueryKeys.chat.all, "channelFiles", channelId] as const,
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<{ files: ChannelFile[]; nextCursor?: number }>(
        `/chat/channels/${channelId}/files`,
        pageParam !== undefined ? { cursor: String(pageParam) } : undefined,
        signal,
        chatChannelFilesContract,
      ),
    getNextPageParam: (last) => last.nextCursor,
    initialPageParam: NO_ID_CURSOR_YET,
    enabled: canRead && channelId > 0,
  });
}
