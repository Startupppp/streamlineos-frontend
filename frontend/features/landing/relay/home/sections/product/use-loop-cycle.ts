"use client";

import { useEffect, useRef, useState } from "react";

import { VIEW_MARGIN } from "@/features/landing/relay/lib/view";

import { useReducedMotionPref } from "./use-card-play";

export const LOOP_HOLD = 2800;
export const LOOP_RESET = 800;

export const useLoopCycle = (playMs: number) => {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotionPref();
  const [visible, setVisible] = useState(false);
  const [inLine, setInLine] = useState(false);
  const [armed, setArmed] = useState(false);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const any = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    const line = new IntersectionObserver(
      ([entry]) => setInLine(entry.isIntersecting),
      { rootMargin: VIEW_MARGIN },
    );
    any.observe(el);
    line.observe(el);
    return () => {
      any.disconnect();
      line.disconnect();
    };
  }, []);

  if (visible && inLine && !armed) setArmed(true);
  if (!visible && armed) setArmed(false);

  useEffect(() => {
    if (!armed || reduced) {
      setOn(false);
      return;
    }
    let timer = 0;
    const play = () => {
      setOn(true);
      timer = window.setTimeout(reset, playMs + LOOP_HOLD);
    };
    const reset = () => {
      setOn(false);
      timer = window.setTimeout(play, LOOP_RESET);
    };
    play();
    return () => window.clearTimeout(timer);
  }, [armed, reduced, playMs]);

  return {
    ref,
    on: on || reduced,
    visible,
    reduced,
    snap: reduced || !visible,
  };
};
