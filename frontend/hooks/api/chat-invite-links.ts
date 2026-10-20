"use client";

import { useEffect } from "react";
import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { markStale } from "@/hooks/api/chat-channel-rows";

const chatInviteLinkContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatInviteLinkContract),
);
const chatJoinViaInviteContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatJoinViaInviteContract),
);

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

interface RegenerateInviteLinkInput {
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
