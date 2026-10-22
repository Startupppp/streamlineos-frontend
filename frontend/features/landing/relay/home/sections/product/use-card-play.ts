"use client";

import { useState, useSyncExternalStore } from "react";

import { useDynamicInView } from "@/features/landing/relay/hooks/animation/use-dynamic-in-view";
import { VIEW_MARGIN } from "@/features/landing/relay/lib/view";

export const CARD_START = 240;

export const useCardPlay = () => {
  const [ref, inView] = useDynamicInView({ rootMargin: VIEW_MARGIN });
  const [played, setPlayed] = useState(false);
  if (inView && !played) setPlayed(true);
  return { ref, inView, played };
};

const REDUCE = "(prefers-reduced-motion: reduce)";

const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(REDUCE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

export const useReducedMotionPref = () =>
  useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCE).matches,
    () => false,
  );
