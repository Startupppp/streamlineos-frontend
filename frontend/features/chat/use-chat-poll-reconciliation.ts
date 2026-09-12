"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { useChatPoll, type ChatPollPosition } from "@/hooks/api/chat-core-read";

export const EPOCH_POLL_SINCE = new Date(0).toISOString();
export const OFFLINE_HISTORY_RECONCILE_INTERVAL_MS = 120_000;

export function openingPollPosition(
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
  refetchHistory: () => Promise<{ isError: boolean }>;
}

export function useChatPollReconciliation({
  channelId,
  newestLoadedAt,
  isRealtimeConnected,
  isHistoryLoading,
  refetchHistory,
}: ChatPollReconciliationOptions): {
  position: ChatPollPosition;
} {
  const queryClient = useQueryClient();
  const [position, setPosition] = useState<ChatPollPosition | null>(null);
  const [positionChannelId, setPositionChannelId] = useState(channelId);

  if (positionChannelId !== channelId) {
    setPositionChannelId(channelId);
    setPosition(null);
  }

  const effectivePosition =
    positionChannelId === channelId && position !== null
      ? position
      : openingPollPosition(newestLoadedAt);

  const { data: pollResult } = useChatPoll(
    channelId,
    effectivePosition,
    !isRealtimeConnected && !isHistoryLoading,
  );

  useEffect(() => {
    if (!pollResult || pollResult.messages.length === 0) return;
    const nextPosition = pollResult.nextCursor ?? pollResult.latestPosition;
    let cancelled = false;

    void (async () => {
      const result = await refetchHistory();
      if (cancelled || result.isError) return;
      queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.myChannels(),
      });
      if (nextPosition !== null)
        setPosition({ kind: "cursor", cursor: nextPosition });
    })();

    return () => {
      cancelled = true;
    };
  }, [pollResult, queryClient, refetchHistory]);

  useEffect(() => {
    if (isRealtimeConnected || channelId <= 0) return;
    const timer = setInterval(() => {
      void refetchHistory();
    }, OFFLINE_HISTORY_RECONCILE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isRealtimeConnected, channelId, refetchHistory]);

  return { position: effectivePosition };
}
