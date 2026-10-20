"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

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

interface OlderHistoryLoaderOptions {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  contentKey: unknown;
  isLoading: boolean;
  isAwayFromLatest: boolean;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

export function useOlderHistoryLoader({
  scrollContainerRef,
  contentKey,
  isLoading,
  isAwayFromLatest,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: OlderHistoryLoaderOptions): React.RefObject<HTMLDivElement | null> {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<{
    fromBottom: number;
    height: number;
    sawFetch: boolean;
  } | null>(null);
  const autoLoadedForRef = useRef<unknown>(null);

  const loadOlder = useCallback(() => {
    const el = scrollContainerRef.current;
    pendingRef.current = el
      ? {
          fromBottom: el.scrollHeight - el.scrollTop,
          height: el.scrollHeight,
          sawFetch: false,
        }
      : null;
    fetchNextPage();
  }, [fetchNextPage, scrollContainerRef]);

  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    const pending = pendingRef.current;
    if (!el || !pending) return;
    if (isFetchingNextPage) {
      pending.sawFetch = true;
      return;
    }
    if (el.scrollHeight === pending.height) {
      if (pending.sawFetch || !hasNextPage) pendingRef.current = null;
      return;
    }
    el.scrollTop = el.scrollHeight - pending.fromBottom;
    pendingRef.current = null;
  }, [contentKey, hasNextPage, isFetchingNextPage, scrollContainerRef]);

  useEffect(() => {
    const root = scrollContainerRef.current;
    const target = sentinelRef.current;
    if (!root || !target || isLoading || !hasNextPage || isFetchingNextPage) return;
    if (root.scrollHeight <= root.clientHeight) {
      if (autoLoadedForRef.current === contentKey) return;
      autoLoadedForRef.current = contentKey;
      loadOlder();
      return;
    }
    if (!isAwayFromLatest || typeof IntersectionObserver === "undefined") return;
    function handleIntersection(entries: IntersectionObserverEntry[]) {
      if (entries.some((entry) => entry.isIntersecting)) loadOlder();
    }
    const observer = new IntersectionObserver(handleIntersection, {
      root,
      rootMargin: "300px 0px 0px 0px",
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [
    scrollContainerRef,
    contentKey,
    isLoading,
    isAwayFromLatest,
    hasNextPage,
    isFetchingNextPage,
    loadOlder,
  ]);

  return sentinelRef;
}
