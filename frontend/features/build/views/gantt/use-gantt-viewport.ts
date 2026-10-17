"use client";

import { useState, useEffect, useRef } from "react";

interface GanttViewport {
  viewportWidth: number;
  numDays: number;
  dayWidth: number;
  rowHeight: number;
  headerHeight: number;
  labelWidth: number;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  scrollViewportHeight: number;
  scrollTop: number;
  handleTimelineScroll: (event: React.UIEvent<HTMLDivElement>) => void;
}

export function useGanttViewport(): GanttViewport {
  const [viewportWidth, setViewportWidth] = useState(1280);

  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const numDays = viewportWidth < 640 ? 14 : viewportWidth < 1024 ? 21 : 28;
  const dayWidth = viewportWidth < 640 ? 32 : viewportWidth < 1024 ? 36 : 40;
  const rowHeight = 40;
  const headerHeight = 40;
  const labelWidth = viewportWidth < 640 ? 144 : viewportWidth < 1024 ? 192 : 240;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollViewportHeight, setScrollViewportHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const syncViewportHeight = () => {
      const next = el.clientHeight;
      setScrollViewportHeight((prev) => (Math.abs(prev - next) < 1 ? prev : next));
    };
    syncViewportHeight();
    const ro = new ResizeObserver(syncViewportHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function handleTimelineScroll(event: React.UIEvent<HTMLDivElement>) {
    const next = event.currentTarget.scrollTop;
    setScrollTop((prev) => (Math.abs(prev - next) < rowHeight ? prev : next));
  }

  return {
    viewportWidth,
    numDays,
    dayWidth,
    rowHeight,
    headerHeight,
    labelWidth,
    scrollRef,
    scrollViewportHeight,
    scrollTop,
    handleTimelineScroll,
  };
}
