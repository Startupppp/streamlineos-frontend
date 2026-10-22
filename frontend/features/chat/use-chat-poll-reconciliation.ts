"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { useChatPoll, type ChatPollPosition } from "@/hooks/api/chat-message-windows";
import { recordChatArrival } from "./chat-arrivals";
import { newestConfirmedMessageId } from "./message-page-merge";

const EPOCH_POLL_SINCE = new Date(0).toISOString();
const OFFLINE_HISTORY_RECONCILE_INTERVAL_MS = 120_000;

function openingPollPosition(
  newestLoadedAt: Date | string | null,
): ChatPollPosition {
  return {
    kind: "since",
    since: newestLoadedAt
      ? new Date(newestLoadedAt).toISOString()
      : EPOCH_POLL_SINCE,
  };
}

interface ChatPollReconciliationOptions {
  channelId: number;
  newestLoadedAt: Date | string | null;
  isRealtimeConnected: boolean;
  isHistoryLoading: boolean;
  canReadChannel: boolean;
  refetchHistory: () => Promise<{ isError: boolean }>;
}

export function useChatPollReconciliation({
  channelId,
  newestLoadedAt,
  isRealtimeConnected,
  isHistoryLoading,
  canReadChannel,
  refetchHistory,
}: ChatPollReconciliationOptions): {
  position: ChatPollPosition;
} {
  const queryClient = useQueryClient();
  const [positionState, setPositionState] = useState<{
    channelId: number;
    position: ChatPollPosition | null;
  }>({ channelId, position: null });

  const effectivePosition =
    positionState.channelId === channelId && positionState.position !== null
      ? positionState.position
      : openingPollPosition(newestLoadedAt);

  const { data: pollResult } = useChatPoll(
    channelId,
    effectivePosition,
    canReadChannel && !isRealtimeConnected && !isHistoryLoading,
  );

  useEffect(() => {
    if (!pollResult || pollResult.messages.length === 0) return;
    const nextPosition = pollResult.nextCursor ?? pollResult.latestPosition;
    let cancelled = false;

    void (async () => {
      const messagesKey = collaborationQueryKeys.chat.messages(channelId);
      const newestBefore = newestConfirmedMessageId(queryClient.getQueryData(messagesKey));
      const result = await refetchHistory();
      if (cancelled || result.isError) return;
      const newestAfter = newestConfirmedMessageId(queryClient.getQueryData(messagesKey));
      if (newestBefore > 0 && newestAfter > newestBefore) recordChatArrival(channelId);
      void queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.myChannels(),
        exact: true,
      });
      if (nextPosition !== null)
        setPositionState({
          channelId,
          position: { kind: "cursor", cursor: nextPosition },
        });
    })();

    return () => {
      cancelled = true;
    };
  }, [channelId, pollResult, queryClient, refetchHistory]);

  useEffect(() => {
    if (!canReadChannel || isRealtimeConnected || channelId <= 0) return;
    const timer = setInterval(() => {
      void refetchHistory();
    }, OFFLINE_HISTORY_RECONCILE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [canReadChannel, isRealtimeConnected, channelId, refetchHistory]);

  return { position: effectivePosition };
}
