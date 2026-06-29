"use client";

import { useEffect, useCallback } from "react";
import { useAbly } from "ably/react";
import type { InboundMessage } from "ably";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { queryKeys } from "@/lib/query-keys";

export function useMeetingRealtime(channelId: number | null) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const ably = useAbly();
  const orgId = session?.orgId;

  useEffect(() => {
    if (!orgId || !channelId || channelId <= 0) return;
    const ch = ably.channels.get(`meeting:${orgId}:${channelId}`);
    const handler = (_msg: InboundMessage) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.huddle(channelId) });
    };
    ch.subscribe("meeting:started", handler);
    ch.subscribe("meeting:user_joined", handler);
    ch.subscribe("meeting:user_left", handler);
    ch.subscribe("meeting:ended", handler);
    ch.subscribe("meeting:participant_updated", handler);
    return () => {
      ch.unsubscribe("meeting:started", handler);
      ch.unsubscribe("meeting:user_joined", handler);
      ch.unsubscribe("meeting:user_left", handler);
      ch.unsubscribe("meeting:ended", handler);
      ch.unsubscribe("meeting:participant_updated", handler);
    };
  }, [ably, channelId, orgId, queryClient]);

  const subscribeSignal = useCallback(
    (currentUserId: string, onSignal: (data: { fromUserId: string; type: string; payload: unknown }) => void) => {
      if (!orgId || !channelId || channelId <= 0) return () => {};
      const signalCh = ably.channels.get(`meeting-signal:${orgId}:${channelId}:${currentUserId}`);
      const handler = (msg: InboundMessage) => onSignal(msg.data as { fromUserId: string; type: string; payload: unknown });
      signalCh.subscribe("signal", handler);
      return () => { signalCh.unsubscribe("signal", handler); };
    },
    [ably, channelId, orgId],
  );

  return { subscribeSignal };
}
