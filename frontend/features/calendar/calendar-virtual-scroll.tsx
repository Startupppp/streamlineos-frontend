"use client";

import { useCallback, useEffect, useRef, type ReactNode, type UIEvent } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CalendarVirtualScrollProps {
  children: ReactNode;
}

export function CalendarVirtualScroll({ children }: CalendarVirtualScrollProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const lockRef = useRef<"list" | "viewport" | null>(null);

  const syncFromList = useCallback(() => {
    const list = listRef.current;
    const viewport = viewportRef.current;
    const spacer = spacerRef.current;
    if (!list || !viewport || !spacer) return;
    const nextHeight = `${list.scrollHeight}px`;
    if (spacer.style.height !== nextHeight) spacer.style.height = nextHeight;
    if (lockRef.current === "viewport" || viewport.scrollTop === list.scrollTop) return;
    lockRef.current = "list";
    viewport.scrollTop = list.scrollTop;
    lockRef.current = null;
  }, []);

  const handleViewportScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const list = listRef.current;
    if (!list || lockRef.current === "list") return;
    const next = event.currentTarget.scrollTop;
    if (list.scrollTop === next) return;
    lockRef.current = "viewport";
    list.scrollTop = next;
    lockRef.current = null;
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    let observer: ResizeObserver | null = null;

    const detach = () => {
      listRef.current?.removeEventListener("scroll", syncFromList);
      observer?.disconnect();
      observer = null;
      listRef.current = null;
    };

    const attach = () => {
      const next = frame.querySelector<HTMLDivElement>(":scope > [role='list']");
      if (next === listRef.current) return;
      detach();
      if (!next) return;
      listRef.current = next;
      next.addEventListener("scroll", syncFromList, { passive: true });
      observer = new ResizeObserver(syncFromList);
      observer.observe(next);
      const content = next.querySelector("[aria-hidden='true']");
      if (content) observer.observe(content);
      syncFromList();
    };

    attach();
    const mutations = new MutationObserver(attach);
    mutations.observe(frame, { childList: true });
    return () => {
      detach();
      mutations.disconnect();
    };
  }, [syncFromList]);

  return (
    <div ref={frameRef} className="relative min-h-0 flex-1">
      {children}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <ScrollArea
          type="auto"
          className="h-full"
          viewportRef={viewportRef}
          viewportTabIndex={-1}
          viewportClassName="pointer-events-none"
          scrollbarClassName="pointer-events-auto"
          onViewportScroll={handleViewportScroll}
        >
          <div ref={spacerRef} />
        </ScrollArea>
      </div>
    </div>
  );
}
