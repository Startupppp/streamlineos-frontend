"use client";

import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const chatOkContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatOkContract),
);
const chatChannelDetailContract = lazyContract(() =>
  import("@/hooks/api/chat-extra-schema").then((m) => m.chatChannelDetailContract),
);
const chatEntityChannelLookupContract = lazyContract(() =>
  import("@/hooks/api/chat-extra-schema").then((m) =>
    m.chatChannelDetailContract.nullable(),
  ),
);
const chatMuteResponseContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatMuteResponseContract),
);
const chatNotifPrefResponseContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatNotifPrefResponseContract),
);
const chatChannelFilesContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatChannelFilesContract),
);
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { ChatNotificationPreference } from "@/types/chat";
import type { ChatChannelDetailWire } from "@/hooks/api/chat-extra-schema";
import { NO_ID_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import { runRollbacks, type ChatCacheRollback } from "@/hooks/api/chat-message-cache";
import {
  cancelChatChannelQueries,
  findChannelRow,
  insertChannelRow,
  removeChannelRow,
} from "@/hooks/api/chat-channel-cache";
import { channelRowFromDetail, markStale } from "@/hooks/api/chat-channel-rows";
import { applyOptimisticUnread, patchOwnMember } from "@/hooks/api/chat-read-cache";

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
      return { rollback: applyOptimisticUnread(queryClient, channelId) };
    },
    onError: (_error, _channelId, context) => context?.rollback(),
    onSuccess: (_data, channelId) => markStale(queryClient, collaborationQueryKeys.chat.channel(channelId)),
  });
}

export function useEntityChannel(
  entityType: string | null,
  entityId: string | null,
) {
  const canRead = useCan("chat:channels:read");
  return useQuery({
    ...INLINE_READ_ERROR,
    queryKey: collaborationQueryKeys.chat.entityChannel(entityType, entityId),
    queryFn: ({ signal }) =>
      apiClient.get<ChatChannelDetailWire | null>(`/chat/channels/entity/${entityType}/${entityId}`, undefined, signal, chatEntityChannelLookupContract),
    enabled: canRead && Boolean(entityType && entityId),
    staleTime: 5 * 60_000,
  });
}

interface CreateEntityChannelInput {
  entityType: string;
  entityId: string;
}

export function useCreateEntityChannel() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<ChatChannelDetailWire, Error, CreateEntityChannelInput>(
    "chat:channels:write",
    {
      mutationKey: ["chat", "channels", "entity", "create"],
      mutationFn: ({ entityType, entityId }) =>
        apiClient.post<ChatChannelDetailWire>(
          `/chat/channels/entity/${entityType}/${entityId}`,
          undefined,
          undefined,
          chatChannelDetailContract,
        ),
      onSuccess: (detail, variables) => {
        queryClient.setQueryData<ChatChannelDetailWire | null>(
          collaborationQueryKeys.chat.entityChannel(variables.entityType, variables.entityId),
          detail,
        );
        queryClient.setQueryData<ChatChannelDetailWire>(collaborationQueryKeys.chat.channel(detail.id), detail);
        if (!findChannelRow(queryClient, detail.id))
          insertChannelRow(queryClient, collaborationQueryKeys.chat.myChannels(), channelRowFromDetail(detail));
      },
    },
  );
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

interface ChannelFile {
  id: number;
  messageId: number;
  fileName: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export function useChannelFiles(channelId: number) {
  const canRead = useCan("chat:messages:read");
  return useInfiniteQuery({
    ...INLINE_READ_ERROR,
    queryKey: collaborationQueryKeys.chat.channelFiles(channelId),
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<{ files: ChannelFile[]; nextCursor?: number | null }>(
        `/chat/channels/${channelId}/files`,
        pageParam !== undefined ? { cursor: String(pageParam) } : undefined,
        signal,
        chatChannelFilesContract,
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: NO_ID_CURSOR_YET,
    staleTime: 60_000,
    enabled: canRead && channelId > 0,
  });
}
