"use client";

import { useEffect } from "react";
import {
  skipToken,
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

export interface CreateEntityChannelInput {
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

type InviteLink = { token: string; expiresAt: string | null; maxUses: number | null; useCount: number };

const INVITE_LINK_REFRESH_MS = 5 * 60_000;
const MIN_REMINT_GAP_MS = 30_000;
const echoedExpiries = new Map<number, string>();
const MAX_TIMER_MS = 2_147_483_647;

function inviteMintKey(channelId: number) {
  return ["chat", "channels", "invite-link", "mint", channelId] as const;
}

function useMintChannelInviteLink(channelId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<InviteLink, Error, void>("chat:invite-links:manage", {
    mutationKey: inviteMintKey(channelId),
    mutationFn: () =>
      apiClient.post<InviteLink>(
        `/chat/channels/${channelId}/invite-link`,
        undefined,
        undefined,
        chatInviteLinkContract,
      ),
    onSuccess: (link) => {
      const key = collaborationQueryKeys.chat.inviteLink(channelId);
      const previous = queryClient.getQueryData<InviteLink>(key);
      if (link.expiresAt !== null && previous?.expiresAt === link.expiresAt)
        echoedExpiries.set(channelId, link.expiresAt);
      else echoedExpiries.delete(channelId);
      queryClient.setQueryData(key, link);
    },
  });
}

export function useChannelInviteLink(channelId: number, enabled: boolean) {
  const queryClient = useQueryClient();
  const canManage = useCan("chat:invite-links:manage");
  const active = canManage && enabled && channelId > 0;
  const link = useQuery<InviteLink>({
    queryKey: collaborationQueryKeys.chat.inviteLink(channelId),
    queryFn: skipToken,
    staleTime: INVITE_LINK_REFRESH_MS,
  });
  const mint = useMintChannelInviteLink(channelId);
  const { mutate } = mint;
  const hasLink = link.data !== undefined;
  const expiresAt = link.data?.expiresAt ?? null;
  const { dataUpdatedAt } = link;
  useEffect(() => {
    if (!active) return;
    if (hasLink && expiresAt !== null && echoedExpiries.get(channelId) === expiresAt) return;
    const dueAt = !hasLink
      ? 0
      : Math.max(
          expiresAt !== null ? Date.parse(expiresAt) : dataUpdatedAt + INVITE_LINK_REFRESH_MS,
          dataUpdatedAt + MIN_REMINT_GAP_MS,
        );
    const mintWhenIdle = () => {
      if (queryClient.isMutating({ mutationKey: inviteMintKey(channelId) }) === 0) mutate();
    };
    const timer = setTimeout(mintWhenIdle, Math.min(MAX_TIMER_MS, Math.max(0, dueAt - Date.now())));
    return () => clearTimeout(timer);
  }, [active, hasLink, expiresAt, dataUpdatedAt, channelId, mutate, queryClient]);
  return {
    data: active ? link.data : undefined,
    isLoading: active && !hasLink && !mint.isError,
    isError: mint.isError,
    error: mint.error,
  };
}

export interface RegenerateInviteLinkInput {
  channelId: number;
  ttlSeconds?: number;
  maxUses?: number;
}

export function useRegenerateInviteLink() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<InviteLink, Error, RegenerateInviteLinkInput>(
    "chat:invite-links:manage",
    {
      mutationKey: ["chat", "channels", "invite-link", "regenerate"],
      mutationFn: ({ channelId, ttlSeconds, maxUses }) =>
        apiClient.post<InviteLink>(
          `/chat/channels/${channelId}/invite-link/regenerate`,
          { ...(ttlSeconds !== undefined && { ttlSeconds }), ...(maxUses !== undefined && { maxUses }) },
          undefined,
          chatInviteLinkContract,
        ),
      onSuccess: (link, variables) => {
        queryClient.setQueryData(collaborationQueryKeys.chat.inviteLink(variables.channelId), link);
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
    onSuccess: () => markStale(queryClient, collaborationQueryKeys.chat.myChannels()),
  });
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

export interface ChannelFile {
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
      // The contract reports the end of the list as null, not an absent field.
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
