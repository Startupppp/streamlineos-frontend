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
}: {
  channelId: number;
  autoStartCall: "huddle" | null | undefined;
  onAutoStartHandled: (() => void) | undefined;
  activeHuddle: { id: number } | null | undefined;
  isInHuddle: boolean;
  startHuddle: HuddleStarter;
  joinHuddle: HuddleJoiner;
}): void {
  const autoStartHandledRef = useRef(false);
  const joinHuddleCalledRef = useRef<number | null>(null);

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
    if (joinHuddleCalledRef.current === channelId) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("joinHuddle") === "1" && activeHuddle && !isInHuddle) {
      joinHuddleCalledRef.current = channelId;
      joinHuddle.mutate({ huddleId: activeHuddle.id, channelId });
      const url = new URL(window.location.href);
      url.searchParams.delete("joinHuddle");
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHuddle, channelId]);
}
