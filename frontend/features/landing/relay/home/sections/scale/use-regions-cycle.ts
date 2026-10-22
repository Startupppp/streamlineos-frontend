"use client";

import { useEffect, useRef, useState } from "react";

import { VIEW_MARGIN } from "@/features/landing/relay/lib/view";

export type RegionsPhase = "off" | "play" | "reset";

const PLAY_MS = 1_920;
const HOLD_MS = 2_800;
const RESET_MS = 1_280;

export const useRegionsCycle = <T extends Element>() => {
  const ref = useRef<T>(null);
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState<RegionsPhase>("off");
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const seen = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setActive(true);
      },
      { rootMargin: VIEW_MARGIN },
    );
    const gone = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) setActive(false);
    });
    seen.observe(node.closest("article") ?? node);
    gone.observe(node);
    return () => {
      seen.disconnect();
      gone.disconnect();
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduced) {
      const t = setTimeout(() => setPhase("play"), 0);
      return () => clearTimeout(t);
    }
    if (!active) return;

    let timer: ReturnType<typeof setTimeout>;
    const play = () => {
      setPhase("play");
      timer = setTimeout(reset, PLAY_MS + HOLD_MS);
    };
    const reset = () => {
      setPhase("reset");
      timer = setTimeout(play, RESET_MS);
    };
    timer = setTimeout(play, 0);

    return () => {
      clearTimeout(timer);
      setPhase("off");
    };
  }, [active, reduced]);

  return { ref, phase, reduced };
};
