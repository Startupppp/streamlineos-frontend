"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type ScrollEdgeFadeProps = {
  children: ReactNode;
  className?: string;
  /** Extra class on the scrollable element (the direct overflow container). */
  viewportClassName?: string;
};

/**
 * Horizontal scroll container with edge fades that appear only when
 * more content exists off-screen — so users can tell the row is scrollable.
 */
export function ScrollEdgeFade({
  children,
  className,
  viewportClassName,
}: ScrollEdgeFadeProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateEdges = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    const epsilon = 2;
    setCanScrollLeft(scrollLeft > epsilon);
    setCanScrollRight(maxScroll > epsilon && scrollLeft < maxScroll - epsilon);
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    updateEdges();

    const onScroll = () => updateEdges();
    el.addEventListener("scroll", onScroll, { passive: true });

    const resizeObserver = new ResizeObserver(updateEdges);
    resizeObserver.observe(el);
    if (el.firstElementChild) {
      resizeObserver.observe(el.firstElementChild);
    }

    return () => {
      el.removeEventListener("scroll", onScroll);
      resizeObserver.disconnect();
    };
  }, [updateEdges]);

  return (
    <div className={cn("relative min-w-0", className)}>
      <div
        ref={viewportRef}
        className={cn(
          "overflow-x-auto overscroll-x-contain scrollbar-hide touch-pan-x",
          viewportClassName,
        )}
      >
        {children}
      </div>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent transition-opacity duration-200",
          canScrollLeft ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent transition-opacity duration-200",
          canScrollRight ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
