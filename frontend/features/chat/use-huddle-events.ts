"use client";

import { useEffect } from "react";
import { useAbly } from "ably/react";
import type { InboundMessage } from "ably";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { safeSubscribe, safeUnsubscribe } from "@/lib/ably-safe-subscribe";
import type { HuddleParticipant } from "@/types/chat";
import { useAblyConnection } from "./use-ably-connection";

interface UseHuddleEventsOptions {
  channelId: number;
  currentUserId: string;
  participants: HuddleParticipant[];
  onKicked: () => void;
}

export function useHuddleEvents({
  channelId,
  currentUserId,
  participants,
  onKicked,
}: UseHuddleEventsOptions): void {
  const ably = useAbly();
  const { data: session, status: sessionStatus } = useSession();
  const orgId = session?.orgId;
  const { isConnected: isAblyConnected } = useAblyConnection();

  useEffect(() => {
    if (!orgId || sessionStatus !== "authenticated" || !isAblyConnected) return;

    const ch = ably.channels.get(`huddle:${orgId}:${channelId}`);
    const userCh = ably.channels.get(`notifications:${orgId}:${currentUserId}`);
    let cancelled = false;
    const subscribedHuddle: Array<"huddle:user_joined" | "huddle:user_left"> = [];
    let kickedSubscribed = false;

    const nameFor = (userId: string): string => {
      const participant = participants.find((p) => p.userId === userId);
      return participant?.user?.name ?? "Someone";
    };

    const handleJoined = (msg: InboundMessage) => {
      const data = msg.data as { userId: string };
      if (data.userId === currentUserId) return;
      toast(`${nameFor(data.userId)} joined the huddle`);
    };

    const handleLeft = (msg: InboundMessage) => {
      const data = msg.data as { userId: string };
      if (data.userId === currentUserId) return;
      toast(`${nameFor(data.userId)} left the huddle`);
    };

    const handleKicked = () => {
      toast.error("You were removed from the huddle");
      onKicked();
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

        if (cancelled) return;
        const kickedOk = await safeSubscribe(userCh, "huddle:kicked", handleKicked);
        if (cancelled) {
          if (kickedOk) safeUnsubscribe(userCh, "huddle:kicked", handleKicked);
          return;
        }
        if (kickedOk) kickedSubscribed = true;
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
      if (kickedSubscribed) {
        safeUnsubscribe(userCh, "huddle:kicked", handleKicked);
      }
    };
  }, [ably, orgId, channelId, currentUserId, participants, onKicked, isAblyConnected, sessionStatus]);
}
