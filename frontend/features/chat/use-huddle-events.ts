"use client";

import { useEffect, useRef } from "react";
import { useAbly } from "ably/react";
import type { InboundMessage } from "ably";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { z } from "zod";
import { isForgedServerFrame, safeSubscribe, safeUnsubscribe } from "@/lib/ably-safe-subscribe";
import { huddleChannelName } from "@/lib/ably-channels";
import type { HuddleParticipant } from "@/types/chat";
import { useAblyConnection } from "./use-ably-connection";

const huddleMemberEventSchema = z.object({ userId: z.string() });

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
  const participantsRef = useRef(participants);

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  useEffect(() => {
    if (!orgId || sessionStatus !== "authenticated" || !isAblyConnected) return;

    const ch = ably.channels.get(huddleChannelName(orgId, channelId));
    let cancelled = false;
    const subscribedHuddle: Array<"huddle:user_joined" | "huddle:user_left"> = [];

    const nameFor = (userId: string): string => {
      const participant = participantsRef.current.find((p) => p.userId === userId);
      return participant?.user?.name ?? "Someone";
    };

    const announce = (event: "huddle:user_joined" | "huddle:user_left", msg: InboundMessage) => {
      if (isForgedServerFrame(event, msg.clientId)) return;
      const parsed = huddleMemberEventSchema.safeParse(msg.data);
      if (!parsed.success || parsed.data.userId === currentUserId) return;
      const verb = event === "huddle:user_joined" ? "joined" : "left";
      toast(`${nameFor(parsed.data.userId)} ${verb} the huddle`);
    };

    const handleJoined = (msg: InboundMessage) => announce("huddle:user_joined", msg);
    const handleLeft = (msg: InboundMessage) => announce("huddle:user_left", msg);

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
  }, [ably, orgId, channelId, currentUserId, isAblyConnected, sessionStatus]);
}
