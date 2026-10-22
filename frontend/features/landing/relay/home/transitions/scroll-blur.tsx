"use client";

import { animated, useSpring } from "@react-spring/web";
import { useEffect, useRef, type ReactNode } from "react";

import { subscribeToTicker } from "@/features/landing/relay/lib/animation/ticker";
import { readScrollY } from "@/features/landing/relay/lib/scroll-y";
import { SPRING } from "@/features/landing/relay/lib/motion";

const DRIFT = 48;
const ENTER_FROM = 0.6;
const LEAVE_TO = 0.25;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export const ScrollBlur = ({
  children,
  enter = false,
  leave = false,
  still = false,
}: {
  children: ReactNode;
  enter?: boolean;
  leave?: boolean;
  still?: boolean;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [springs, api] = useSpring(() => ({
    opacity: 1,
    y: 0,
    config: SPRING,
  }));

  useEffect(() => {
    const el = ref.current;
    if (!el || (!enter && !leave)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const drift = still ? 0 : DRIFT;
    let docTop = 0;
    let height = 0;
    let vh = 1;
    let last = Number.NaN;
    let stop: (() => void) | null = null;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      docTop = rect.top + window.scrollY;
      height = rect.height;
      vh = window.innerHeight;
    };

    const frame = () => {
      const top = docTop - readScrollY();
      const bottom = top + height;
      let opacity = 1;
      let y = 0;
      if (enter) {
        const p = clamp((vh - top) / (vh / 2));
        opacity *= mix(ENTER_FROM, 1, p);
        y += mix(drift, 0, p);
      }
      if (leave) {
        const p = clamp((vh / 2 - bottom) / (vh / 2));
        opacity *= mix(1, LEAVE_TO, p);
        y += mix(0, -drift, p);
      }
      const key = opacity * 1e4 + y;
      if (key === last) return;
      last = key;
      api.start({ opacity, y });
    };

    const run = (on: boolean) => {
      if (on && !stop) {
        measure();
        stop = subscribeToTicker(frame, () => 0);
      } else if (!on && stop) {
        stop();
        stop = null;
        frame();
      }
    };

    const io = new IntersectionObserver(([entry]) => run(entry.isIntersecting));
    io.observe(el);
    const layout = new ResizeObserver(() => {
      measure();
      if (stop) frame();
    });
    layout.observe(el);
    const main = el.closest("main");
    if (main) layout.observe(main);
    window.addEventListener("resize", measure);
    return () => {
      stop?.();
      io.disconnect();
      layout.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [api, enter, leave, still]);

  return (
    <div ref={ref}>
      <animated.div style={springs}>{children}</animated.div>
    </div>
  );
};
