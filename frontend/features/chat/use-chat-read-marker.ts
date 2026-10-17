"use client";

import { useEffect, useRef } from "react";

const MARK_READ_DEBOUNCE_MS = 1_000;

interface ReadMarker {
  mutate: (input: { channelId: number }) => void;
}

export function useChatReadMarker({
  channelId,
  newestMessageId,
  markRead,
}: {
  channelId: number;
  newestMessageId: number | undefined;
  markRead: ReadMarker;
}): void {
  const openedChannelRef = useRef<number | null>(null);
  const markedNewestRef = useRef<{
    channelId: number;
    messageId: number;
  } | null>(null);

  useEffect(() => {
    if (channelId > 0 && openedChannelRef.current !== channelId) {
      openedChannelRef.current = channelId;
      markRead.mutate({ channelId });
    }
  }, [channelId, markRead]);

  useEffect(() => {
    if (channelId <= 0 || newestMessageId === undefined || newestMessageId < 0)
      return;
    const marked = markedNewestRef.current;
    if (marked?.channelId !== channelId) {
      markedNewestRef.current = { channelId, messageId: newestMessageId };
      return;
    }
    const mark = () => {
      if (document.visibilityState !== "visible") return;
      if (markedNewestRef.current?.messageId === newestMessageId) return;
      markedNewestRef.current = { channelId, messageId: newestMessageId };
      markRead.mutate({ channelId });
    };
    const timer = setTimeout(mark, MARK_READ_DEBOUNCE_MS);
    document.addEventListener("visibilitychange", mark);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", mark);
    };
  }, [channelId, newestMessageId, markRead]);
}
