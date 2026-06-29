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

    const handler = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.huddle(channelId) });
    };

    const meetingCh = ably.channels.get(`meeting:${orgId}:${channelId}`);
    meetingCh.subscribe("meeting:started", handler);

    const huddleCh = ably.channels.get(`huddle:${orgId}:${channelId}`);
    huddleCh.subscribe("huddle:user_joined", handler);
    huddleCh.subscribe("huddle:user_left", handler);
    huddleCh.subscribe("huddle:ended", handler);
    huddleCh.subscribe("huddle:state_updated", handler);

    return () => {
      meetingCh.unsubscribe("meeting:started", handler);
      huddleCh.unsubscribe("huddle:user_joined", handler);
      huddleCh.unsubscribe("huddle:user_left", handler);
      huddleCh.unsubscribe("huddle:ended", handler);
      huddleCh.unsubscribe("huddle:state_updated", handler);
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
