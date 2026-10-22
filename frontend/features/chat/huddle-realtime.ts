"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { useAbly } from "ably/react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { getErrorMessage } from "@/lib/get-error-message";
import type { InboundMessage } from "ably";
import {
  isForgedServerFrame,
  safeConnect,
  safeSubscribe,
  safeUnsubscribe,
} from "@/lib/ably-safe-subscribe";
import { huddleChannelName } from "@/lib/ably-channels";
import { resolveHuddleEndToast } from "@/hooks/api/chat-huddles";
import { useAblyConnection } from "./use-ably-connection";

const HUDDLE_EVENTS = [
  "huddle:started",
  "huddle:user_joined",
  "huddle:user_left",
  "huddle:ended",
  "huddle:state_updated",
] as const;

type HuddleEvent = (typeof HUDDLE_EVENTS)[number];

const providerEndSyncedPayload = z.object({
  providerSyncStatus: z.enum(["confirmed", "failed"]),
});

export function useHuddleRealtime(channelId: number | null): {
  isConnected: boolean;
  connectionError: string | null;
} {
  const queryClient = useQueryClient();
  const { data: session, status: sessionStatus } = useSession();
  const ably = useAbly();
  const orgId = session?.orgId;
  const { isConnected, connectionError: ablyConnectionError } =
    useAblyConnection();
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !channelId || channelId <= 0) return;
    if (sessionStatus !== "authenticated") return;

    const connectionState = ably.connection.state;
    if (connectionState === "closed" || connectionState === "failed") {
      if (connectionState === "closed") {
        safeConnect(ably);
      }
      return;
    }

    if (!isConnected && connectionState !== "connected") return;

    const channel = ably.channels.get(huddleChannelName(orgId, channelId));
    let cancelled = false;
    const subscribed: HuddleEvent[] = [];
    let providerEndSubscribed = false;

    const handleHuddleEvent = (msg: InboundMessage) => {
      if (isForgedServerFrame(msg.name ?? "", msg.clientId)) return;
      queryClient.invalidateQueries({
        queryKey: collaborationQueryKeys.chat.huddle(channelId),
      });
    };

    const handleProviderEndSynced = (msg: InboundMessage) => {
      if (isForgedServerFrame(msg.name ?? "", msg.clientId)) return;
      const parsed = providerEndSyncedPayload.safeParse(msg.data);
      if (!parsed.success) return;
      resolveHuddleEndToast(channelId, parsed.data.providerSyncStatus);
    };

    async function setup() {
      try {
        if (ably.connection.state !== "connected") {
          await ably.connection.whenState("connected");
        }
        if (cancelled) return;

        setSubscribeError(null);

        for (const event of HUDDLE_EVENTS) {
          if (cancelled) return;
          if (ably.connection.state !== "connected") return;

          const ok = await safeSubscribe(channel, event, handleHuddleEvent);
          if (cancelled) {
            if (ok) safeUnsubscribe(channel, event, handleHuddleEvent);
            return;
          }
          if (ok) subscribed.push(event);
        }

        if (cancelled) return;
        if (ably.connection.state !== "connected") return;

        const providerEndOk = await safeSubscribe(
          channel,
          "huddle:provider_end_synced",
          handleProviderEndSynced,
        );
        if (cancelled) {
          if (providerEndOk)
            safeUnsubscribe(
              channel,
              "huddle:provider_end_synced",
              handleProviderEndSynced,
            );
          return;
        }
        providerEndSubscribed = providerEndOk;
      } catch (err: unknown) {
        if (!cancelled) {
          setSubscribeError(getErrorMessage(err));
        }
      }
    }

    void setup();

    return () => {
      cancelled = true;
      for (const event of subscribed)
        safeUnsubscribe(channel, event, handleHuddleEvent);

      if (providerEndSubscribed)
        safeUnsubscribe(
          channel,
          "huddle:provider_end_synced",
          handleProviderEndSynced,
        );
    };
  }, [ably, channelId, orgId, queryClient, isConnected, sessionStatus]);

  return {
    isConnected,
    connectionError: subscribeError ?? ablyConnectionError,
  };
}
