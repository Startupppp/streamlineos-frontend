"use client";

import { useEffect, useState } from "react";
import { useAbly } from "ably/react";
import type { InboundMessage } from "ably";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { queryKeys } from "@/lib/query-keys";
import { safeSubscribe, safeUnsubscribe } from "@/lib/ably-safe-subscribe";

interface TicketUpdatedPayload {
  ticketId: number;
  updatedAt: string;
}

interface MessageCreatedPayload {
  ticketId: number;
  messageId: number;
}

export function useSupportRealtime(ticketId: number | null): { isConnected: boolean } {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const ably = useAbly();
  const orgId = session?.orgId;

  const [isConnected, setIsConnected] = useState(() => ably.connection.state === "connected");

  useEffect(() => {
    const handleConnected = () => setIsConnected(true);
    const handleDisconnected = () => setIsConnected(false);

    ably.connection.on("connected", handleConnected);
    ably.connection.on("disconnected", handleDisconnected);
    ably.connection.on("failed", handleDisconnected);
    ably.connection.on("suspended", handleDisconnected);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsConnected(ably.connection.state === "connected");

    return () => {
      ably.connection.off("connected", handleConnected);
      ably.connection.off("disconnected", handleDisconnected);
      ably.connection.off("failed", handleDisconnected);
      ably.connection.off("suspended", handleDisconnected);
    };
  }, [ably]);

  useEffect(() => {
    if (!orgId || !ticketId || ticketId <= 0) return;

    const channelName = `support:${orgId}:${ticketId}`;
    const channel = ably.channels.get(channelName);

    const ticketUpdatedHandler = (msg: InboundMessage) => {
      const payload = msg.data as TicketUpdatedPayload;
      if (!payload?.ticketId) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.support.detail(payload.ticketId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.support.all });
    };

    const messageHandler = (msg: InboundMessage) => {
      const payload = msg.data as MessageCreatedPayload;
      if (!payload?.ticketId) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.support.detail(payload.ticketId) });
    };

    let cancelled = false;
    const subscribed: Array<"ticket-updated" | "message"> = [];

    async function setup() {
      const ticketOk = await safeSubscribe(channel, "ticket-updated", ticketUpdatedHandler);
      if (cancelled) {
        if (ticketOk) safeUnsubscribe(channel, "ticket-updated", ticketUpdatedHandler);
        return;
      }
      if (ticketOk) subscribed.push("ticket-updated");

      const messageOk = await safeSubscribe(channel, "message", messageHandler);
      if (cancelled) {
        if (messageOk) safeUnsubscribe(channel, "message", messageHandler);
        return;
      }
      if (messageOk) subscribed.push("message");
    }

    void setup();

    return () => {
      cancelled = true;
      for (const event of subscribed) {
        const handler = event === "ticket-updated" ? ticketUpdatedHandler : messageHandler;
        safeUnsubscribe(channel, event, handler);
      }
    };
  }, [ably, ticketId, orgId, queryClient]);

  return { isConnected };
}
