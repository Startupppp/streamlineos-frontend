"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PresenceMessage, RealtimeClient } from "ably";
import { chatChannelName } from "@/lib/ably-channels";
import { reviveFailedChannel } from "./chat-realtime-helpers";

const TYPING_TIMEOUT_MS = 5_000;
const TYPING_IDLE_MS = 3_000;

interface ChatTypingOptions {
  ably: RealtimeClient;
  channelId: number | null;
  orgId: string | null | undefined;
  currentUserId: string | undefined;
  joinRequired: boolean;
  isConnected: boolean;
}

export function useChatTyping({
  ably,
  channelId,
  orgId,
  currentUserId,
  joinRequired,
  isConnected,
}: ChatTypingOptions): { typingUserIds: string[]; publishTyping: () => void } {
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (joinRequired || !orgId || !channelId || channelId <= 0) return;
    const channel = ably.channels.get(chatChannelName(orgId, channelId));
    const timers = typingTimers.current;
    const stop = (userId: string): void => {
      const timer = timers.get(userId);
      if (timer) clearTimeout(timer);
      timers.delete(userId);
      setTypingUserIds((prev) => prev.filter((id) => id !== userId));
    };
    const listener = (member: PresenceMessage): void => {
      const userId = member.clientId;
      if (!userId || userId === currentUserId) return;
      const typing =
        (member.action === "enter" || member.action === "update") &&
        typeof member.data === "object" &&
        member.data !== null &&
        "typing" in member.data &&
        member.data.typing === true;
      if (!typing) return stop(userId);
      setTypingUserIds((prev) =>
        prev.includes(userId) ? prev : [...prev, userId],
      );
      const existing = timers.get(userId);
      if (existing) clearTimeout(existing);
      timers.set(
        userId,
        setTimeout(() => stop(userId), TYPING_TIMEOUT_MS),
      );
    };
    let presenceCancelled = false;
    void reviveFailedChannel(channel)
      .then(() =>
        presenceCancelled ? undefined : channel.presence.subscribe(listener),
      )
      .catch(() => {});
    return () => {
      presenceCancelled = true;
      channel.presence.unsubscribe(listener);
      void channel.presence.leave().catch(() => {});
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = null;
      setTypingUserIds([]);
    };
  }, [ably, channelId, orgId, currentUserId, joinRequired]);

  const publishTyping = useCallback(() => {
    if (
      !orgId ||
      !channelId ||
      channelId <= 0 ||
      !currentUserId ||
      !isConnected
    )
      return;
    const channel = ably.channels.get(chatChannelName(orgId, channelId));
    void channel.presence.update({ typing: true }).catch(() => {});
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      idleTimer.current = null;
      void channel.presence.update({ typing: false }).catch(() => {});
    }, TYPING_IDLE_MS);
  }, [ably, channelId, orgId, currentUserId, isConnected]);

  return { typingUserIds, publishTyping };
}
