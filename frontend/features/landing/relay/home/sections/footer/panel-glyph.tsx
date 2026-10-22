"use client";

import { animated, useSpring } from "@react-spring/web";
import { useEffect } from "react";

import { SPRING } from "@/features/landing/relay/lib/motion";

import { useLoopReady } from "./stage";
import { useLoopGate } from "./use-loop-gate";

const SPRING_FAST = {
  tension: SPRING.tension * 1.5,
  friction: SPRING.friction * 1.22,
} as const;

const STRIDE = 26;
const LEAD = 320;
const HOLD = 720;
const REST = 2080;

const LAG = 0.3;
const lead = (p: number) => Math.min(1, p / (1 - LAG));

export const PanelGlyph = () => {
  const { ref, inView, reduced } = useLoopGate<SVGSVGElement>();
  const ready = useLoopReady();
  const [{ p }, api] = useSpring(() => ({ p: 0, config: SPRING_FAST }));

  useEffect(() => {
    if (!ready || !inView || reduced) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, ms);
      });
    const run = async () => {
      await wait(LEAD);
      while (alive) {
        await api.start({ p: 1 });
        if (!alive) return;
        await wait(HOLD);
        if (!alive) return;
        await api.start({ p: 0 });
        if (!alive) return;
        await wait(REST);
      }
    };
    void run();
    return () => {
      alive = false;
      clearTimeout(timer);
      api.stop();
      api.set({ p: 0 });
    };
  }, [ready, inView, reduced, api]);

  return (
    <svg
      ref={ref}
      aria-hidden="true"
      width={300}
      height={300}
      viewBox="0 0 300 300"
      fill="none"
      overflow="visible"
      className="absolute -top-10 left-74.75 block size-75 max-w-none w1024:-top-12 w1024:left-58.75 w768:-top-11 w768:left-119.25 w768:size-71.25 w768:[clip-path:inset(calc(var(--spacing)*17)_calc(var(--spacing)*24.5)_calc(var(--spacing)*16.75)_calc(var(--spacing)*12.25))] w390:-top-8.75 w390:[clip-path:inset(calc(var(--spacing)*13.75)_calc(var(--spacing)*19.25)_calc(var(--spacing)*13.25)_calc(var(--spacing)*10))] w390:left-44.75 w390:size-57"
    >
      
      <animated.image
        href="/logo-email.svg"
        x={20}
        y={20}
        width={260}
        height={260}
        opacity={p.to((v) => 0.1 + 0.08 * lead(v))}
        style={{ transform: p.to((v) => `translateX(${STRIDE * lead(v)}px)`) }}
      />
    </svg>
  );
};
