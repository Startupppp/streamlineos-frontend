"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const AT_BOTTOM_THRESHOLD = 80;
const LOAD_OLDER_THRESHOLD = 120;

function isNearBottom(el: HTMLElement): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= AT_BOTTOM_THRESHOLD;
}

interface UseChatScrollOptions {
  channelId: number;
  messageCount: number;
  isLoading: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

export function useChatScroll({
  channelId,
  messageCount,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: UseChatScrollOptions) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const prevScrollHeightRef = useRef(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (behavior === "smooth") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    } else {
      el.scrollTop = el.scrollHeight;
    }
    isAtBottomRef.current = true;
    setShowScrollBtn(false);
  }, []);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const atBottom = isNearBottom(el);
      isAtBottomRef.current = atBottom;
      setShowScrollBtn(!atBottom);

      if (
        el.scrollHeight > el.clientHeight + 1 &&
        el.scrollTop < LOAD_OLDER_THRESHOLD &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        prevScrollHeightRef.current = el.scrollHeight;
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  // Open channel at the latest message.
  useEffect(() => {
    isAtBottomRef.current = true;
    setShowScrollBtn(false);
    if (!isLoading) {
      requestAnimationFrame(() => scrollToBottom("auto"));
    }
  }, [channelId, isLoading, scrollToBottom]);

  // Stick to bottom for new messages only when already near bottom.
  useEffect(() => {
    if (isLoading) return;
    if (isAtBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom("auto"));
    }
  }, [messageCount, isLoading, scrollToBottom]);

  // Preserve scroll position when older messages are prepended.
  useEffect(() => {
    if (isFetchingNextPage) return;
    const el = scrollContainerRef.current;
    if (!el || prevScrollHeightRef.current <= 0) return;

    const heightAdded = el.scrollHeight - prevScrollHeightRef.current;
    if (heightAdded > 0) {
      el.scrollTop += heightAdded;
    }
    prevScrollHeightRef.current = 0;
  }, [messageCount, isFetchingNextPage]);

  return {
    scrollContainerRef,
    messagesEndRef,
    showScrollBtn,
    scrollToBottom,
    handleScroll,
    isAtBottomRef,
  };
}
