"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { useDynamicInView } from "@/features/landing/relay/hooks/animation/use-dynamic-in-view";
import { VIEW_MARGIN } from "@/features/landing/relay/lib/view";

export const useSeen = () => {
  const [seen, setSeen] = useState(false);
  const [setSeenNode] = useDynamicInView({
    rootMargin: VIEW_MARGIN,
    onEnter: () => setSeen(true),
  });
  const [setViewNode, inView] = useDynamicInView({
    onLeave: () => setSeen(false),
  });
  const setNode = useCallback(
    (node: Element | null) => {
      setSeenNode((node?.closest("article") ?? node) as HTMLElement | null);
      setViewNode(node as HTMLElement | null);
    },
    [setSeenNode, setViewNode],
  );
  return [setNode, seen, inView] as const;
};

export const useLoopPhase = (
  seen: boolean,
  inView: boolean,
  {
    lead = 0,
    play,
    hold,
    reset,
  }: {
    lead?: number;
    play: number;
    hold: number;
    reset: number;
  },
) => {
  const reduced = useReducedMotionPref();
  const [phase, setPhase] = useState<{ on: boolean; cycle: number }>({
    on: false,
    cycle: 0,
  });
  if (!seen && (phase.on || phase.cycle !== 0)) {
    setPhase({ on: false, cycle: 0 });
  }
  const on = seen && (phase.on || phase.cycle === 0);
  useEffect(() => {
    if (!seen || !inView || reduced) return;
    const id = window.setTimeout(
      () =>
        setPhase((p) =>
          p.on || p.cycle === 0
            ? { on: false, cycle: p.cycle + 1 }
            : { on: true, cycle: p.cycle },
        ),
      on ? (phase.cycle === 0 ? lead : 0) + play + hold : reset,
    );
    return () => window.clearTimeout(id);
  }, [seen, inView, reduced, on, phase.cycle, lead, play, hold, reset]);
  return { on: on || (seen && reduced), cycle: phase.cycle };
};

const REDUCE = "(prefers-reduced-motion: reduce)";

export const useReducedMotionPref = () =>
  useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(REDUCE);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCE).matches,
    () => false,
  );

export const useAfter = (start: boolean, ms: number) => {
  const [done, setDone] = useState(false);
  if (!start && done) setDone(false);
  useEffect(() => {
    if (!start) return;
    const id = window.setTimeout(() => setDone(true), ms);
    return () => window.clearTimeout(id);
  }, [start, ms]);
  return start && done;
};

export const useFrameLoop = (
  active: boolean,
  onFrame: (elapsed: number) => void,
  rewind = false,
  onRewind?: () => void,
) => {
  const frame = useRef(onFrame);
  const reset = useRef(onRewind);
  const elapsed = useRef(0);
  useEffect(() => {
    frame.current = onFrame;
    reset.current = onRewind;
  });
  useEffect(() => {
    if (!rewind) return;
    elapsed.current = 0;
    reset.current?.();
  }, [rewind]);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsed.current += now - last;
      last = now;
      frame.current(elapsed.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
};
