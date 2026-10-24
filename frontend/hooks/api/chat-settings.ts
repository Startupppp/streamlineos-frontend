"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { ChatNotificationPreference } from "@/types/chat";
import { runRollbacks, type ChatCacheRollback } from "@/hooks/api/chat-message-cache";
import {
  cancelChatChannelQueries,
  insertChannelRow,
  removeChannelRow,
} from "@/hooks/api/chat-channel-cache";
import { markStale } from "@/hooks/api/chat-channel-rows";
import { applyOptimisticUnread, patchOwnMember } from "@/hooks/api/chat-read-cache";
import { suppressAutoMarkRead } from "@/hooks/api/chat-mark-read-suppress";

const chatOkContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatOkContract),
);
const chatMuteResponseContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatMuteResponseContract),
);
const chatNotifPrefResponseContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatNotifPrefResponseContract),
);

interface RollbackContext {
  rollback: ChatCacheRollback;
}

const MUTE_DURATION_MS: Record<string, number> = {
  "15m": 900_000,
  "1h": 3_600_000,
  "8h": 28_800_000,
  "24h": 86_400_000,
};
const MUTED_FOREVER = new Date("2099-12-31").toISOString();

function mutedUntilFor(duration: string): string | null {
  if (duration === "forever") return MUTED_FOREVER;
  const ms = MUTE_DURATION_MS[duration];
  return ms === undefined ? null : new Date(Date.now() + ms).toISOString();
}

function useOwnMemberToggle(
  mutationKey: string,
  path: string,
  patch: Parameters<typeof patchOwnMember>[3],
) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  return useAuthorizedMutation<{ ok: boolean }, Error, number, RollbackContext>("chat:channels:write", {
    mutationKey: ["chat", "channels", mutationKey],
    mutationFn: (channelId) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/${path}`, undefined, undefined, chatOkContract),
    onMutate: async (channelId) => {
      await cancelChatChannelQueries(queryClient, channelId);
      return { rollback: patchOwnMember(queryClient, channelId, userId, patch) };
    },
    onError: (_error, _channelId, context) => context?.rollback(),
  });
}

function useArchiveToggle(archive: boolean) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const from = archive ? collaborationQueryKeys.chat.myChannels() : collaborationQueryKeys.chat.archivedChannels();
  const to = archive ? collaborationQueryKeys.chat.archivedChannels() : collaborationQueryKeys.chat.myChannels();
  return useAuthorizedMutation<{ ok: boolean }, Error, number, RollbackContext>("chat:channels:write", {
    mutationKey: ["chat", "channels", archive ? "archive" : "unarchive"],
    mutationFn: (channelId) =>
      apiClient.post<{ ok: boolean }>(
        `/chat/channels/${channelId}/${archive ? "archive" : "unarchive"}`,
        undefined,
        undefined,
        chatOkContract,
      ),
    onMutate: async (channelId) => {
      await cancelChatChannelQueries(queryClient, channelId);
      const { removed, rollback } = removeChannelRow(queryClient, from, channelId);
      const rollbacks = [
        rollback,
        patchOwnMember(queryClient, channelId, userId, {
          archivedAt: archive ? new Date().toISOString() : null,
        }),
      ];
      if (removed) rollbacks.push(insertChannelRow(queryClient, to, removed));
      return { rollback: () => runRollbacks(rollbacks) };
    },
    onError: (_error, _channelId, context) => context?.rollback(),
  });
}

export function useArchiveChannel() {
  return useArchiveToggle(true);
}

export function useUnarchiveChannel() {
  return useArchiveToggle(false);
}

export function useMarkChannelUnread() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ ok: boolean }, Error, number, RollbackContext>("chat:messages:write", {
    mutationKey: ["chat", "channels", "mark-unread"],
    mutationFn: (channelId) =>
      apiClient.post<{ ok: boolean }>(
        `/chat/channels/${channelId}/mark-unread`,
        undefined,
        undefined,
        chatOkContract,
      ),
    onMutate: async (channelId) => {
      await cancelChatChannelQueries(queryClient, channelId);
      suppressAutoMarkRead(channelId);
      return { rollback: applyOptimisticUnread(queryClient, channelId) };
    },
    onError: (_error, _channelId, context) => context?.rollback(),
    onSuccess: (_data, channelId) => markStale(queryClient, collaborationQueryKeys.chat.channel(channelId)),
  });
}

export function useMuteChannel() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  return useAuthorizedMutation<
    { ok: boolean; mutedUntil: string },
    Error,
    { channelId: number; duration: string },
    RollbackContext
  >("chat:channels:write", {
    mutationKey: ["chat", "channels", "mute"],
    mutationFn: ({ channelId, duration }) =>
      apiClient.post<{ ok: boolean; mutedUntil: string }>(
        `/chat/channels/${channelId}/mute`,
        { duration },
        undefined,
        chatMuteResponseContract,
      ),
    onMutate: async ({ channelId, duration }) => {
      await cancelChatChannelQueries(queryClient, channelId);
      const mutedUntil = mutedUntilFor(duration);
      if (mutedUntil === null) return { rollback: () => undefined };
      return { rollback: patchOwnMember(queryClient, channelId, userId, { mutedUntil }) };
    },
    onError: (_error, _variables, context) => context?.rollback(),
    onSuccess: ({ mutedUntil }, { channelId }) => {
      patchOwnMember(queryClient, channelId, userId, { mutedUntil });
    },
  });
}

export function useUnmuteChannel() {
  return useOwnMemberToggle("unmute", "unmute", { mutedUntil: null });
}

export function useFavoriteChannel() {
  return useOwnMemberToggle("favorite", "favorite", { isFavorite: true });
}

export function useUnfavoriteChannel() {
  return useOwnMemberToggle("unfavorite", "unfavorite", { isFavorite: false });
}

export function useSetNotificationPreference() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  return useAuthorizedMutation<
    { ok: boolean; notificationPreference: ChatNotificationPreference },
    Error,
    { channelId: number; preference: ChatNotificationPreference },
    RollbackContext
  >("chat:channels:write", {
    mutationKey: ["chat", "channels", "notification-preference"],
    mutationFn: ({ channelId, preference }) =>
      apiClient.post<{ ok: boolean; notificationPreference: ChatNotificationPreference }>(
        `/chat/channels/${channelId}/notification-preference`,
        { preference },
        undefined,
        chatNotifPrefResponseContract,
      ),
    onMutate: async ({ channelId, preference }) => {
      await cancelChatChannelQueries(queryClient, channelId);
      return {
        rollback: patchOwnMember(queryClient, channelId, userId, { notificationPreference: preference }),
      };
    },
    onError: (_error, _variables, context) => context?.rollback(),
    onSuccess: ({ notificationPreference }, { channelId }) => {
      patchOwnMember(queryClient, channelId, userId, { notificationPreference });
    },
  });
}
