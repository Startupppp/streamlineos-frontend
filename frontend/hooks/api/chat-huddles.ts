"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, isApiError } from "@/lib/api-client";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";
import { useCan } from "@/hooks/api/access";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { lazyContract } from "@/lib/api-envelope";
import type { Huddle } from "@/types/chat";

const HEARTBEAT_INTERVAL_MS = 30_000;

const MEETING_PRECONDITION_FAILED = 412;
const MEETING_TEMPORARILY_UNAVAILABLE = 503;

const activeHuddleContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatActiveHuddleContract),
);
const huddleContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatHuddleContract),
);
const chatOkContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatOkContract),
);

export function useActiveHuddle(channelId: number) {
  const canRead = useCan("chat:channels:read");
  return useQuery({
    ...INLINE_READ_ERROR,
    queryKey: collaborationQueryKeys.chat.huddle(channelId),
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
  const retryRef = useRef<(channelId: number) => void>(() => undefined);
  const startHuddle = useAuthorizedMutation("chat:huddles:start", {
    mutationKey: ["chat", "huddle", "start"],
    mutationFn: (channelId: number) =>
      apiClient.post<Huddle>(
        `/chat/channels/${channelId}/huddle/start`,
        undefined,
        undefined,
        huddleContract,
      ),
    onSuccess: (_, channelId) => {
      queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.huddle(channelId),
      });
      queryClient.invalidateQueries({
        queryKey: platformHierarchyQueryKeys.calendar.all,
        exact: false,
      });
    },
    onError: (error, channelId) => {
      const message = getErrorMessage(error);
      if (isApiError(error) && error.status === MEETING_PRECONDITION_FAILED) {
        toast.error(message, { duration: Number.POSITIVE_INFINITY });
        return;
      }
      if (
        isApiError(error) &&
        error.status === MEETING_TEMPORARILY_UNAVAILABLE
      ) {
        toast.error(message, {
          action: {
            label: "Try again",
            onClick: () => retryRef.current(channelId),
          },
        });
        return;
      }
      toast.error(message);
    },
  });
  retryRef.current = startHuddle.mutate;
  return startHuddle;
}

export function useJoinHuddle() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "huddle", "join"],
    mutationFn: ({ huddleId }: { huddleId: number; channelId: number }) =>
      apiClient.post<{ ok: boolean }>(
        `/chat/huddles/${huddleId}/join`,
        undefined,
        undefined,
        chatOkContract,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.huddle(variables.channelId),
      });
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
      apiClient.post<{ ok: boolean }>(
        `/chat/huddles/${huddleId}/leave`,
        undefined,
        undefined,
        chatOkContract,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.huddle(variables.channelId),
      });
      queryClient.invalidateQueries({
        queryKey: platformHierarchyQueryKeys.calendar.all,
        exact: false,
      });
    },
  });
}

export function useHuddleHeartbeat(huddleId: number): void {
  const heartbeat = useAuthorizedMutation("chat:channels:read", {
    mutationKey: ["chat", "huddle", "heartbeat"],
    mutationFn: (huddleId: number) =>
      apiClient.patch<{ ok: boolean }>(
        `/chat/huddles/${huddleId}/heartbeat`,
        undefined,
        undefined,
        chatOkContract,
      ),
  });
  const { mutate } = heartbeat;

  useEffect(() => {
    const id = setInterval(() => mutate(huddleId), HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [huddleId, mutate]);
}

export function useKickParticipant() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("chat:huddles:moderate", {
    mutationKey: ["chat", "huddle", "kick"],
    mutationFn: ({
      huddleId,
      targetUserId,
    }: {
      huddleId: number;
      channelId: number;
      targetUserId: string;
    }) =>
      apiClient.post<{ ok: boolean }>(
        `/chat/huddles/${huddleId}/kick`,
        { targetUserId },
        undefined,
        chatOkContract,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.huddle(variables.channelId),
      });
    },
  });
}

export function useInviteToHuddle() {
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("chat:channels:write", {
    mutationKey: ["chat", "huddle", "invite"],
    mutationFn: ({
      huddleId,
      userIds,
    }: {
      huddleId: number;
      userIds: string[];
    }) =>
      apiClient.post<{ ok: boolean }>(
        `/chat/huddles/${huddleId}/invite`,
        { userIds },
        operation.configFor({ huddleId, userIds }),
        chatOkContract,
      ),
    onSuccess: () => {
      operation.settle();
    },
  });
}
