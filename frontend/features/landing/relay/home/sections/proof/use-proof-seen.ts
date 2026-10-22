"use client";

import { useEffect, useRef, useState } from "react";

import { VIEW_MARGIN } from "@/features/landing/relay/lib/view";

const checks = new Set<() => void>();
const atBottom = () => {
  const doc = document.documentElement;
  if (window.scrollY + window.innerHeight < doc.scrollHeight - 4) return;
  for (const check of checks) check();
};
const watchBottom = (check: () => void) => {
  if (checks.size === 0)
    window.addEventListener("scroll", atBottom, { passive: true });
  checks.add(check);
  return () => {
    checks.delete(check);
    if (checks.size === 0) window.removeEventListener("scroll", atBottom);
  };
};

export const useProofSeen = <T extends Element>() => {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const zone = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setSeen(true);
      },
      { rootMargin: VIEW_MARGIN },
    );
    const screen = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) setSeen(false);
    });
    zone.observe(el);
    screen.observe(el);
    const check = () => {
      const { top, bottom } = el.getBoundingClientRect();
      if (top < window.innerHeight && bottom > 0) setSeen(true);
    };
    const unwatch = watchBottom(check);
    atBottom();
    return () => {
      zone.disconnect();
      screen.disconnect();
      unwatch();
    };
  }, []);

  return { ref, seen };
};
