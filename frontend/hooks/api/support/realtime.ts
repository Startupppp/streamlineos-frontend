"use client";

import { useEffect, useState } from "react";
import { useAbly } from "ably/react";
import type { InboundMessage } from "ably";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { safeSubscribe, safeUnsubscribe } from "@/lib/ably-safe-subscribe";
import { supportChannelName } from "@/lib/ably-channels";
import { isRecord } from "@/lib/is-record";

/**
 * An Ably message body is `any`, so declaring a payload interface and asserting
 * `msg.data` into it checked nothing — the shape was a comment with syntax. Both
 * handlers only ever read `ticketId`, so read exactly that, and verify it.
 */
function readTicketId(data: unknown): number | null {
  if (!isRecord(data) || typeof data.ticketId !== "number" || !data.ticketId)
    return null;
  return data.ticketId;
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

    const channelName = supportChannelName(orgId, ticketId);
    const channel = ably.channels.get(channelName);

    const ticketUpdatedHandler = (msg: InboundMessage) => {
      const updatedTicketId = readTicketId(msg.data);
      if (updatedTicketId === null) return;
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.support.detail(updatedTicketId) });
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.support.all });
    };

    const messageHandler = (msg: InboundMessage) => {
      const messageTicketId = readTicketId(msg.data);
      if (messageTicketId === null) return;
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.support.detail(messageTicketId) });
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
