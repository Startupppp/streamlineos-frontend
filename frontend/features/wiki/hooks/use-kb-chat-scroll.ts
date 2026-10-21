"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

interface UseKbChatScrollParams {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  persistedLength: number;
}

export function useKbChatScroll({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  persistedLength,
}: UseKbChatScrollParams) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);
  const loadingOlderRef = useRef(false);
  const isNearBottomRef = useRef(true);

  const loadOlder = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loadingOlderRef.current || !hasNextPage || isFetchingNextPage) return;
    prevScrollHeightRef.current = el.scrollHeight;
    loadingOlderRef.current = true;
    void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadOlder();
      },
      { root, threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, loadOlder]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (loadingOlderRef.current) {
      el.scrollTop += el.scrollHeight - prevScrollHeightRef.current;
      loadingOlderRef.current = false;
    } else {
      el.scrollTop = el.scrollHeight;
      isNearBottomRef.current = true;
    }
  }, [persistedLength]);

  const markNearBottom = useCallback(() => {
    isNearBottomRef.current = true;
  }, []);

  const scrollToBottomIfNear = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !isNearBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  return {
    scrollRef,
    topSentinelRef,
    handleScroll,
    loadOlder,
    markNearBottom,
    scrollToBottomIfNear,
  };
}
