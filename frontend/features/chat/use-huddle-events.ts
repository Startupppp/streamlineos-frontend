"use client";

import { useEffect } from "react";
import { useAbly } from "ably/react";
import type { InboundMessage } from "ably";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { isForgedServerFrame, safeSubscribe, safeUnsubscribe } from "@/lib/ably-safe-subscribe";
import { huddleChannelName } from "@/lib/ably-channels";
import type { HuddleParticipant } from "@/types/chat";
import { useAblyConnection } from "./use-ably-connection";

interface UseHuddleEventsOptions {
  channelId: number;
  currentUserId: string;
  participants: HuddleParticipant[];
}

export function useHuddleEvents({
  channelId,
  currentUserId,
  participants,
}: UseHuddleEventsOptions): void {
  const ably = useAbly();
  const { data: session, status: sessionStatus } = useSession();
  const orgId = session?.orgId;
  const { isConnected: isAblyConnected } = useAblyConnection();

  useEffect(() => {
    if (!orgId || sessionStatus !== "authenticated" || !isAblyConnected) return;

    const ch = ably.channels.get(huddleChannelName(orgId, channelId));
    let cancelled = false;
    const subscribedHuddle: Array<"huddle:user_joined" | "huddle:user_left"> = [];

    const nameFor = (userId: string): string => {
      const participant = participants.find((p) => p.userId === userId);
      return participant?.user?.name ?? "Someone";
    };

    const handleJoined = (msg: InboundMessage) => {
      if (isForgedServerFrame("huddle:user_joined", msg.clientId)) return;
      const data = msg.data as { userId: string };
      if (data.userId === currentUserId) return;
      toast(`${nameFor(data.userId)} joined the huddle`);
    };

    const handleLeft = (msg: InboundMessage) => {
      if (isForgedServerFrame("huddle:user_left", msg.clientId)) return;
      const data = msg.data as { userId: string };
      if (data.userId === currentUserId) return;
      toast(`${nameFor(data.userId)} left the huddle`);
    };

    async function setup() {
      try {
        if (ably.connection.state !== "connected") {
          await ably.connection.whenState("connected");
        }
        if (cancelled) return;

        for (const event of ["huddle:user_joined", "huddle:user_left"] as const) {
          if (cancelled) return;
          const listener = event === "huddle:user_joined" ? handleJoined : handleLeft;
          const ok = await safeSubscribe(ch, event, listener);
          if (cancelled) {
            if (ok) safeUnsubscribe(ch, event, listener);
            return;
          }
          if (ok) subscribedHuddle.push(event);
        }
      } catch {
        return;
      }
    }

    void setup();

    return () => {
      cancelled = true;
      for (const event of subscribedHuddle) {
        safeUnsubscribe(
          ch,
          event,
          event === "huddle:user_joined" ? handleJoined : handleLeft,
        );
      }
    };
  }, [ably, orgId, channelId, currentUserId, participants, isAblyConnected, sessionStatus]);
}
