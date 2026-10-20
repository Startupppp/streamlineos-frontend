"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";
import { useCan } from "@/hooks/api/access";
import { isHuddleNotJoined, reportHuddleStartError } from "@/hooks/api/chat-huddle-errors";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { lazyContract } from "@/lib/api-envelope";
import type { Huddle } from "@/types/chat";

const HEARTBEAT_INTERVAL_MS = 30_000;

const activeHuddleContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatActiveHuddleContract),
);
const huddleContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatHuddleContract),
);
const chatOkContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatOkContract),
);

type HuddleRollback = { previous: Huddle | null | undefined };

async function patchActiveHuddle(
  queryClient: QueryClient,
  channelId: number,
  patch: (current: Huddle) => Huddle | null,
): Promise<HuddleRollback> {
  const queryKey = collaborationQueryKeys.chat.huddle(channelId);
  await queryClient.cancelQueries({ queryKey, exact: true });
  const previous = queryClient.getQueryData<Huddle | null>(queryKey);
  if (previous) queryClient.setQueryData<Huddle | null>(queryKey, patch(previous));
  return { previous };
}

function restoreActiveHuddle(
  queryClient: QueryClient,
  channelId: number,
  context: HuddleRollback | undefined,
): void {
  if (context?.previous === undefined) return;
  queryClient.setQueryData(collaborationQueryKeys.chat.huddle(channelId), context.previous);
}

function refreshActiveHuddle(queryClient: QueryClient, channelId: number): void {
  queryClient.invalidateQueries({
    queryKey: collaborationQueryKeys.chat.huddle(channelId),
    exact: true,
  });
}

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
    onSuccess: (huddle, channelId) => {
      queryClient.setQueryData(collaborationQueryKeys.chat.huddle(channelId), huddle);
      queryClient.invalidateQueries({
        queryKey: platformHierarchyQueryKeys.calendar.all,
        exact: false,
      });
    },
    onError: (error, channelId) => {
      reportHuddleStartError(error, () => retryRef.current(channelId));
    },
  });
  const { mutate: startMutate } = startHuddle;
  useEffect(() => {
    retryRef.current = startMutate;
  }, [startMutate]);
  return startHuddle;
}

export function useJoinHuddle() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const viewer = session?.user;
  return useAuthorizedMutation<
    { ok: boolean },
    Error,
    { huddleId: number; channelId: number },
    HuddleRollback
  >("chat:channels:write", {
    mutationKey: ["chat", "huddle", "join"],
    mutationFn: ({ huddleId }: { huddleId: number; channelId: number }) =>
      apiClient.post<{ ok: boolean }>(
        `/chat/huddles/${huddleId}/join`,
        undefined,
        undefined,
        chatOkContract,
      ),
    onMutate: ({ huddleId, channelId }) =>
      patchActiveHuddle(queryClient, channelId, (current) => {
        if (!viewer?.id || current.participants.some((p) => p.userId === viewer.id)) return current;
        const joined = {
          id: -huddleId,
          huddleId,
          joinedAt: new Date().toISOString(),
          leftAt: null,
          userId: viewer.id,
          user: { id: viewer.id, name: viewer.name ?? null, image: viewer.image ?? null },
        };
        return { ...current, participants: [...current.participants, joined] };
      }),
    onSuccess: (_, variables) => {
      refreshActiveHuddle(queryClient, variables.channelId);
    },
    onError: (error, variables, context) => {
      restoreActiveHuddle(queryClient, variables.channelId, context);
      toast.error(getErrorMessage(error));
    },
  });
}

export function useLeaveHuddle() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const viewerId = session?.user?.id;
  return useAuthorizedMutation<
    { ok: boolean },
    Error,
    { huddleId: number; channelId: number },
    HuddleRollback
  >("chat:channels:write", {
    mutationKey: ["chat", "huddle", "leave"],
    mutationFn: ({ huddleId }: { huddleId: number; channelId: number }) =>
      apiClient.post<{ ok: boolean }>(
        `/chat/huddles/${huddleId}/leave`,
        undefined,
        undefined,
        chatOkContract,
      ),
    onMutate: ({ channelId }) =>
      patchActiveHuddle(queryClient, channelId, (current) => {
        const remaining = current.participants.filter((p) => p.userId !== viewerId);
        return remaining.length === 0 ? null : { ...current, participants: remaining };
      }),
    onSuccess: (_, variables) => {
      refreshActiveHuddle(queryClient, variables.channelId);
      queryClient.invalidateQueries({
        queryKey: platformHierarchyQueryKeys.calendar.all,
        exact: false,
      });
    },
    onError: (_error, variables, context) => {
      restoreActiveHuddle(queryClient, variables.channelId, context);
    },
  });
}

export function useHuddleHeartbeat(huddleId: number, channelId: number): void {
  const queryClient = useQueryClient();
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
    const id = setInterval(
      () =>
        mutate(huddleId, {
          onError: (error) => {
            if (!isHuddleNotJoined(error)) return;
            clearInterval(id);
            refreshActiveHuddle(queryClient, channelId);
          },
        }),
      HEARTBEAT_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, [huddleId, channelId, mutate, queryClient]);
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
