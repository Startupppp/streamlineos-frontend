"use client";

import { useEffect } from "react";
import { useAbly } from "ably/react";
import type { InboundMessage } from "ably";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

/**
 * Listens for new messages on any channel so the sidebar unread counts refresh
 * even when no conversation is selected (per-channel Ably is not subscribed).
 */
export function useChatInboxRealtime(orgId: string | undefined): void {
  const queryClient = useQueryClient();
  const ably = useAbly();

  useEffect(() => {
    if (!orgId) return;

    const channelName = `chat:${orgId}:inbox`;
    const channel = ably.channels.get(channelName);

    const handler = (_msg: InboundMessage) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.unreadTotal() });
    };

    channel.subscribe("channel_message", handler);

    return () => {
      channel.unsubscribe("channel_message", handler);
    };
  }, [ably, orgId, queryClient]);
}
