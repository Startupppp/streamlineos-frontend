"use client";

import { useEffect, useRef } from "react";
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";
import { useCan } from "@/hooks/api/access";
import {
  isHuddleNotJoined,
  reportHuddleStartError,
} from "@/hooks/api/chat-huddle-errors";
import { huddleEndedCopy } from "@/features/chat/huddle-provider";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { lazyContract } from "@/lib/api-envelope";
import type { Huddle } from "@/types/chat";

const HEARTBEAT_INTERVAL_MS = 30_000;

let optimisticParticipantSeq = 0;

const activeHuddleContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatActiveHuddleContract),
);
const huddleContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatHuddleContract),
);
const chatOkContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatOkContract),
);
const leaveHuddleContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.leaveHuddleResponseContract),
);
const huddleAccountsContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.huddleAccountsListContract),
);

const PROVIDER_END_WAIT_MS = 15_000;

const pendingEndToastIds = new Map<number, string | number>();

export function resolveHuddleEndToast(
  channelId: number,
  providerSyncStatus: "confirmed" | "failed",
): void {
  const id = pendingEndToastIds.get(channelId);
  if (id === undefined) return;
  pendingEndToastIds.delete(channelId);
  if (providerSyncStatus === "confirmed")
    toast.success(huddleEndedCopy(providerSyncStatus), { id });
  else toast.warning(huddleEndedCopy(providerSyncStatus), { id });
}

type HuddleRollback = { previous: Huddle | null | undefined };

async function patchActiveHuddle(
  queryClient: QueryClient,
  channelId: number,
  patch: (current: Huddle) => Huddle | null,
): Promise<HuddleRollback> {
  const queryKey = collaborationQueryKeys.chat.huddle(channelId);
  await queryClient.cancelQueries({ queryKey, exact: true });
  const previous = queryClient.getQueryData<Huddle | null>(queryKey);
  if (previous)
    queryClient.setQueryData<Huddle | null>(queryKey, patch(previous));
  return { previous };
}

function restoreActiveHuddle(
  queryClient: QueryClient,
  channelId: number,
  context: HuddleRollback | undefined,
): void {
  if (context?.previous === undefined) return;
  queryClient.setQueryData(
    collaborationQueryKeys.chat.huddle(channelId),
    context.previous,
  );
}

function refreshActiveHuddle(
  queryClient: QueryClient,
  channelId: number,
): void {
  queryClient.invalidateQueries({
    queryKey: collaborationQueryKeys.chat.huddle(channelId),
    exact: true,
  });
}

export function useActiveHuddle(channelId: number, enabled = true) {
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
    enabled: enabled && canRead && channelId > 0,
  });
}

type StartHuddleVars = { channelId: number; connectionId?: number };

export function useStartHuddle() {
  const queryClient = useQueryClient();
  const retryRef = useRef<(vars: StartHuddleVars) => void>(() => undefined);
  const startHuddle = useAuthorizedMutation("chat:huddles:start", {
    mutationKey: ["chat", "huddle", "start"],
    mutationFn: ({ channelId, connectionId }: StartHuddleVars) =>
      apiClient.post<Huddle>(
        `/chat/channels/${channelId}/huddle/start`,
        connectionId !== undefined ? { connectionId } : undefined,
        undefined,
        huddleContract,
      ),
    onSuccess: async (huddle, { channelId }) => {
      const queryKey = collaborationQueryKeys.chat.huddle(channelId);
      await queryClient.cancelQueries({ queryKey, exact: true });
      queryClient.setQueryData(queryKey, huddle);
      queryClient.invalidateQueries({
        queryKey: platformHierarchyQueryKeys.calendar.all,
        exact: false,
      });
    },
    onError: (error, vars) => {
      reportHuddleStartError(
        error,
        () => retryRef.current(vars),
        (connectionId) => retryRef.current({ channelId: vars.channelId, connectionId }),
      );
    },
  });
  const { mutate: startMutate } = startHuddle;
  useEffect(() => {
    retryRef.current = startMutate;
  }, [startMutate]);
  return startHuddle;
}

export function useHuddleAccounts() {
  const canStart = useCan("chat:huddles:start");
  return useQuery({
    queryKey: collaborationQueryKeys.chat.huddleAccounts(),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/chat/huddle/meeting-accounts",
        undefined,
        signal,
        huddleAccountsContract,
      ),
    enabled: canStart,
    staleTime: 30_000,
    ...INLINE_READ_ERROR,
  });
}

export function useSetHuddleDefault() {
  const queryClient = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("chat:huddles:start", {
    mutationKey: ["chat", "huddle", "set-default"],
    mutationFn: ({ connectionId }: { connectionId: number | null }) =>
      apiClient.put<{ ok: true }>(
        "/chat/huddle/meeting-accounts/default",
        { connectionId },
        operation.configFor({ connectionId }),
        chatOkContract,
      ),
    onSuccess: () => {
      operation.settle();
      queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.huddleAccounts(),
        exact: true,
      });
    },
  });
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
        if (
          !viewer?.id ||
          current.participants.some((p) => p.userId === viewer.id)
        )
          return current;
        const joined = {
          id: --optimisticParticipantSeq,
          huddleId,
          joinedAt: new Date().toISOString(),
          leftAt: null,
          userId: viewer.id,
          user: {
            id: viewer.id,
            name: viewer.name ?? null,
            image: viewer.image ?? null,
          },
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

type LeaveHuddleResponse = {
  ok: true;
  providerSyncStatus?: "pending" | "skipped";
};

export function useLeaveHuddle() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const viewerId = session?.user?.id;
  return useAuthorizedMutation<
    LeaveHuddleResponse,
    Error,
    { huddleId: number; channelId: number },
    HuddleRollback
  >("chat:channels:write", {
    mutationKey: ["chat", "huddle", "leave"],
    mutationFn: ({ huddleId }: { huddleId: number; channelId: number }) =>
      apiClient.post<LeaveHuddleResponse>(
        `/chat/huddles/${huddleId}/leave`,
        undefined,
        undefined,
        leaveHuddleContract,
      ),
    onMutate: ({ channelId }) =>
      patchActiveHuddle(queryClient, channelId, (current) => {
        const remaining = current.participants.filter(
          (p) => p.userId !== viewerId,
        );
        return remaining.length === 0
          ? null
          : { ...current, participants: remaining };
      }),
    onSuccess: (result, variables) => {
      if (result.providerSyncStatus === "pending") {
        const id = toast.loading("Ending huddle...");
        pendingEndToastIds.set(variables.channelId, id);
        setTimeout(() => {
          if (pendingEndToastIds.get(variables.channelId) === id) {
            resolveHuddleEndToast(variables.channelId, "failed");
          }
        }, PROVIDER_END_WAIT_MS);
      } else if (result.providerSyncStatus === "skipped") {
        toast.success("Huddle ended");
      }
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

export function useHuddleHeartbeat(
  huddleId: number,
  channelId: number,
  isJoined: boolean,
): void {
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
    if (!isJoined) return;
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
  }, [huddleId, channelId, isJoined, mutate, queryClient]);
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
