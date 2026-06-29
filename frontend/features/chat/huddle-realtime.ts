"use client";

import { useEffect } from "react";
import { useAbly } from "ably/react";
import type { InboundMessage } from "ably";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { queryKeys } from "@/lib/query-keys";
import { useActiveHuddle } from "@/lib/api/hooks/chat-huddles";

export function useHuddleRealtime(channelId: number) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const ably = useAbly();
  const orgId = session?.orgId;
  const activeHuddleQuery = useActiveHuddle(channelId);

  useEffect(() => {
    if (!orgId || !channelId || channelId <= 0) return;

    const channelName = `huddle:${orgId}:${channelId}`;
    const channel = ably.channels.get(channelName);

    const handleHuddleEvent = (_msg: InboundMessage) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.huddle(channelId) });
    };

    channel.subscribe("huddle:started", handleHuddleEvent);
    channel.subscribe("huddle:user_joined", handleHuddleEvent);
    channel.subscribe("huddle:user_left", handleHuddleEvent);
    channel.subscribe("huddle:ended", handleHuddleEvent);
    channel.subscribe("huddle:state_updated", handleHuddleEvent);

    return () => {
      channel.unsubscribe("huddle:started", handleHuddleEvent);
      channel.unsubscribe("huddle:user_joined", handleHuddleEvent);
      channel.unsubscribe("huddle:user_left", handleHuddleEvent);
      channel.unsubscribe("huddle:ended", handleHuddleEvent);
      channel.unsubscribe("huddle:state_updated", handleHuddleEvent);
    };
  }, [ably, channelId, orgId, queryClient]);

  return {
    activeHuddle: activeHuddleQuery.data ?? null,
    refetch: activeHuddleQuery.refetch,
  };
}
