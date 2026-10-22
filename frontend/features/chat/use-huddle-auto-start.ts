"use client";

import { useEffect, useRef } from "react";

interface HuddleStarter {
  mutate: (channelId: number) => void;
}

interface HuddleJoiner {
  mutate: (input: { huddleId: number; channelId: number }) => void;
}

export function useHuddleAutoStart({
  channelId,
  autoStartCall,
  onAutoStartHandled,
  activeHuddle,
  isInHuddle,
  startHuddle,
  joinHuddle,
  joinHuddleRequested,
  huddleSettled,
  onJoinHuddleHandled,
}: {
  channelId: number;
  autoStartCall: "huddle" | null | undefined;
  onAutoStartHandled: (() => void) | undefined;
  activeHuddle: { id: number } | null | undefined;
  isInHuddle: boolean;
  startHuddle: HuddleStarter;
  joinHuddle: HuddleJoiner;
  joinHuddleRequested: boolean;
  huddleSettled: boolean;
  onJoinHuddleHandled: (() => void) | undefined;
}): void {
  const autoStartHandledRef = useRef(false);

  useEffect(() => {
    if (!autoStartCall) {
      autoStartHandledRef.current = false;
      return;
    }
    if (autoStartHandledRef.current) return;
    autoStartHandledRef.current = true;
    if (activeHuddle) {
      joinHuddle.mutate({ huddleId: activeHuddle.id, channelId });
    } else {
      startHuddle.mutate(channelId);
    }
    onAutoStartHandled?.();
  }, [
    autoStartCall,
    channelId,
    activeHuddle,
    startHuddle,
    joinHuddle,
    onAutoStartHandled,
  ]);

  useEffect(() => {
    if (!joinHuddleRequested || !huddleSettled) return;
    if (activeHuddle && !isInHuddle) {
      joinHuddle.mutate({ huddleId: activeHuddle.id, channelId });
    }
    onJoinHuddleHandled?.();
  }, [
    joinHuddleRequested,
    huddleSettled,
    activeHuddle,
    isInHuddle,
    channelId,
    joinHuddle,
    onJoinHuddleHandled,
  ]);
}
