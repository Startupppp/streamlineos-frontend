"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function DeferredDashboardContent({
  children,
  fallback,
  onVisible,
}: {
  children: ReactNode;
  fallback: ReactNode;
  onVisible?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      onVisible?.();
      return;
    }

    function handleIntersection(entries: IntersectionObserverEntry[]) {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setIsVisible(true);
      onVisible?.();
    }

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin: "0px 0px",
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [onVisible]);

  return (
    <div ref={containerRef} className="flex flex-col gap-4">
      {isVisible ? children : fallback}
    </div>
  );
}
