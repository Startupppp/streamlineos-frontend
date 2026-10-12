"use client";

import { useEffect, useRef } from "react";

interface IntersectSentinelProps {
  onVisible: () => void;
  root?: Element | null;
}

export function IntersectSentinel({ onVisible, root }: IntersectSentinelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onVisible();
      },
      { threshold: 0.1, root: root ?? null },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onVisible, root]);

  return <div ref={ref} className="h-px" aria-hidden />;
}
