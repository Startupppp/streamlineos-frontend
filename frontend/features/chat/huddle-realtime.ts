"use client";

import { useEffect } from "react";
import { useAbly } from "ably/react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { queryKeys } from "@/lib/query-keys";

export function useHuddleRealtime(channelId: number | null) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const ably = useAbly();
  const orgId = session?.orgId;

  useEffect(() => {
    if (!orgId || !channelId || channelId <= 0) return;

    const channel = ably.channels.get(`huddle:${orgId}:${channelId}`);

    const handler = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.huddle(channelId) });
    };

    channel.subscribe("huddle:started", handler);
    channel.subscribe("huddle:user_joined", handler);
    channel.subscribe("huddle:user_left", handler);
    channel.subscribe("huddle:ended", handler);
    channel.subscribe("huddle:state_updated", handler);

    return () => {
      channel.unsubscribe("huddle:started", handler);
      channel.unsubscribe("huddle:user_joined", handler);
      channel.unsubscribe("huddle:user_left", handler);
      channel.unsubscribe("huddle:ended", handler);
      channel.unsubscribe("huddle:state_updated", handler);
    };
  }, [ably, channelId, orgId, queryClient]);
}
