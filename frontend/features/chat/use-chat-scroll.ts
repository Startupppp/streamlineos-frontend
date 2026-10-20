"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const AT_BOTTOM_THRESHOLD = 80;

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
}: UseChatScrollOptions) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
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

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const atBottom = isNearBottom(e.currentTarget);
    isAtBottomRef.current = atBottom;
    setShowScrollBtn(!atBottom);
  }, []);

  // Open channel at the latest message.
  useEffect(() => {
    isAtBottomRef.current = true;
    const raf = requestAnimationFrame(() => {
      if (!isLoading) scrollToBottom("auto");
      setShowScrollBtn(false);
    });
    return () => cancelAnimationFrame(raf);
  }, [channelId, isLoading, scrollToBottom]);

  // Stick to bottom for new messages only when already near bottom.
  useEffect(() => {
    if (isLoading) return;
    if (!isAtBottomRef.current) return;
    const raf = requestAnimationFrame(() => scrollToBottom("auto"));
    return () => cancelAnimationFrame(raf);
  }, [messageCount, isLoading, scrollToBottom]);

  return {
    scrollContainerRef,
    messagesEndRef,
    showScrollBtn,
    scrollToBottom,
    handleScroll,
    isAtBottomRef,
  };
}
