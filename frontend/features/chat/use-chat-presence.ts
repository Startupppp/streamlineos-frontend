"use client";

import { useEffect, useRef } from "react";
import { useAbly } from "ably/react";
import { useSession } from "next-auth/react";
import { useChatHeartbeat } from "@/hooks/api/chat-core-mutations-b";
import { chatPresenceChannelName } from "@/lib/ably-channels";

const LEADER_LOCK_NAME = "chat-presence-leader";

export const FALLBACK_BASE_MS = 15_000;
export const FALLBACK_MAX_MS = 120_000;
export const FALLBACK_JITTER_MS = 5_000;
const MAX_BACKOFF_ATTEMPT = 5;

export function computeFallbackDelay(attempt: number): number {
  const base = Math.min(FALLBACK_BASE_MS * 2 ** attempt, FALLBACK_MAX_MS);
  return base + Math.floor(Math.random() * FALLBACK_JITTER_MS);
}

export function useChatPresence(): void {
  const ably = useAbly();
  const { data: session } = useSession();
  const heartbeat = useChatHeartbeat();
  const heartbeatRef = useRef(heartbeat);
  heartbeatRef.current = heartbeat;
  const orgId = session?.orgId;
  const userId = session?.user?.id;

  useEffect(() => {
    if (!orgId || !userId) return;

    const channel = ably.channels.get(chatPresenceChannelName(orgId));
    let entered = false;

    const enterPresence = (): void => {
      if (entered) return;
      entered = true;
      channel.presence.enter({ userId }).catch(() => {});
    };

    const leavePresence = (): void => {
      if (!entered) return;
      entered = false;
      channel.presence.leave().catch(() => {});
    };

    if (ably.connection.state === "connected") {
      enterPresence();
    }

    ably.connection.on("connected", enterPresence);
    ably.connection.on("disconnected", leavePresence);
    ably.connection.on("failed", leavePresence);
    ably.connection.on("closed", leavePresence);

    return () => {
      ably.connection.off("connected", enterPresence);
      ably.connection.off("disconnected", leavePresence);
      ably.connection.off("failed", leavePresence);
      ably.connection.off("closed", leavePresence);
      leavePresence();
    };
  }, [ably, orgId, userId]);

  useEffect(() => {
    if (!userId) return;
    if (typeof navigator === "undefined" || !("locks" in navigator)) return;

    let cancelled = false;
    let resolveLeader: (() => void) | null = null;

    void navigator.locks.request(
      LEADER_LOCK_NAME,
      (_lock: Lock | null): Promise<void> =>
        new Promise<void>((resolve) => {
          let timeoutId: ReturnType<typeof setTimeout> | null = null;
          let attempt = 0;

          const cleanup = (): void => {
            if (timeoutId !== null) clearTimeout(timeoutId);
            document.removeEventListener("visibilitychange", handleVisibility);
            window.removeEventListener("online", handleOnline);
            resolve();
          };

          resolveLeader = cleanup;

          const schedule = (): void => {
            if (cancelled) {
              cleanup();
              return;
            }
            timeoutId = setTimeout(tick, computeFallbackDelay(attempt));
          };

          const tick = (): void => {
            if (cancelled) {
              cleanup();
              return;
            }
            const isConnected = ably.connection.state === "connected";

            if (isConnected) {
              attempt = 0;
            } else if (!document.hidden && navigator.onLine) {
              heartbeatRef.current.mutate();
              attempt = Math.min(attempt + 1, MAX_BACKOFF_ATTEMPT);
            }

            schedule();
          };

          const handleVisibility = (): void => {
            if (document.hidden || ably.connection.state === "connected") return;
            if (timeoutId !== null) clearTimeout(timeoutId);
            tick();
          };

          const handleOnline = (): void => {
            if (ably.connection.state === "connected") return;
            if (timeoutId !== null) clearTimeout(timeoutId);
            tick();
          };

          document.addEventListener("visibilitychange", handleVisibility);
          window.addEventListener("online", handleOnline);

          if (
            ably.connection.state !== "connected" &&
            !document.hidden &&
            navigator.onLine
          ) {
            heartbeatRef.current.mutate();
          }
          schedule();
        }),
    );

    return () => {
      cancelled = true;
      resolveLeader?.();
    };
  }, [userId, ably]);
}
