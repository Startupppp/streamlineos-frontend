"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";
import { useCan } from "@/hooks/api/access";
import { lazyContract } from "@/lib/api-envelope";
import type { Huddle, HuddleSignalInput } from "@/types/chat";

/**
 * `hooks/api/index.ts` re-exports this module, so a value import of
 * `chat-schema` put Zod's whole runtime into the first load of every route that
 * touches the barrel. Resolved when a huddle read or write actually runs.
 */
const activeHuddleContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatActiveHuddleContract),
);
const huddleContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatHuddleContract),
);

export function useActiveHuddle(channelId: number) {
  const canRead = useCan("chat:channels:read");
  return useQuery({
    queryKey: queryKeys.chat.huddle(channelId),
    queryFn: ({ signal }) =>
      apiClient.get<Huddle | null>(
        `/chat/channels/${channelId}/huddle`,
        undefined,
        signal,
        activeHuddleContract,
      ),
    staleTime: 10_000,
    enabled: canRead && channelId > 0,
  });
}

export function useStartHuddle() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:huddles:start", {
    mutationKey: ["chat", "huddle", "start"],
    mutationFn: (channelId: number) =>
      apiClient.post<Huddle>(
        `/chat/channels/${channelId}/huddle/start`,
        undefined,
        undefined,
        huddleContract,
      ),
    onSuccess: (_, channelId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.huddle(channelId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all, exact: false });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useJoinHuddle() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "huddle", "join"],
    mutationFn: ({ huddleId }: { huddleId: number; channelId: number }) =>
      apiClient.post<{ ok: boolean }>(`/chat/huddles/${huddleId}/join`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.huddle(variables.channelId) });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useLeaveHuddle() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "huddle", "leave"],
    mutationFn: ({ huddleId }: { huddleId: number; channelId: number }) =>
      apiClient.post<{ ok: boolean }>(`/chat/huddles/${huddleId}/leave`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.huddle(variables.channelId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all, exact: false });
    },
  });
}

export function useHuddleHeartbeat() {
  return useAuthorizedMutation("chat:channels:read", {
    mutationKey: ["chat", "huddle", "heartbeat"],
    mutationFn: ({ huddleId }: { huddleId: number }) =>
      apiClient.patch<{ ok: boolean }>(`/chat/huddles/${huddleId}/heartbeat`),
  });
}

export function useSetHuddleMute() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:messages:write", {
    mutationKey: ["chat", "huddle", "mute"],
    mutationFn: ({ huddleId, muted }: { huddleId: number; channelId: number; muted: boolean }) =>
      apiClient.patch<{ ok: boolean }>(`/chat/huddles/${huddleId}/mute`, { muted }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.huddle(variables.channelId) });
    },
  });
}

export function useRaiseHand() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:messages:write", {
    mutationKey: ["chat", "huddle", "hand"],
    mutationFn: ({ huddleId, raised }: { huddleId: number; channelId: number; raised: boolean }) =>
      apiClient.patch<{ ok: boolean }>(`/chat/huddles/${huddleId}/hand`, { raised }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.huddle(variables.channelId) });
    },
  });
}

export function useSendHuddleSignal() {
  return useAuthorizedMutation("chat:messages:write", {
    mutationKey: ["chat", "huddle", "signal"],
    mutationFn: ({ huddleId, ...signal }: { huddleId: number } & HuddleSignalInput) =>
      apiClient.post<{ ok: boolean }>(`/chat/huddles/${huddleId}/signal`, signal),
  });
}

export function useSetHuddleScreenShare() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:messages:write", {
    mutationKey: ["chat", "huddle", "screenshare"],
    mutationFn: ({ huddleId, isScreenSharing }: { huddleId: number; channelId: number; isScreenSharing: boolean }) =>
      apiClient.patch<{ ok: boolean }>(`/chat/huddles/${huddleId}/screenshare`, { isScreenSharing }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.huddle(variables.channelId) });
    },
  });
}

export function useKickParticipant() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:huddles:moderate", {
    mutationKey: ["chat", "huddle", "kick"],
    mutationFn: ({ huddleId, targetUserId }: { huddleId: number; channelId: number; targetUserId: string }) =>
      apiClient.post<{ ok: boolean }>(`/chat/huddles/${huddleId}/kick`, { targetUserId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.huddle(variables.channelId) });
    },
  });
}

export function useSetHuddleDeafen() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "huddle", "deafen"],
    mutationFn: ({ huddleId, deafened }: { huddleId: number; channelId: number; deafened: boolean }) =>
      apiClient.patch<{ ok: boolean }>(`/chat/huddles/${huddleId}/deafen`, { deafened }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.huddle(variables.channelId) });
    },
  });
}

/**
 * `POST /chat/huddles/:huddleId/invite` is `@Idempotent("chat.huddle.invite")`, and the
 * interceptor 400s a request that carries no `Idempotency-Key` before the handler runs —
 * so this hook sent every invite into a rejection until the header was added.
 */
export function useInviteToHuddle() {
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "huddle", "invite"],
    mutationFn: ({ huddleId, userIds }: { huddleId: number; userIds: string[] }) =>
      apiClient.post<{ ok: boolean }>(
        `/chat/huddles/${huddleId}/invite`,
        { userIds },
        operation.configFor({ huddleId, userIds }),
      ),
    onSuccess: () => {
      operation.settle();
    },
  });
}
