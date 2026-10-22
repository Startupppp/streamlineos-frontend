"use client";

import {
  easings,
  useReducedMotion,
  useSpring,
  type SpringValue,
} from "@react-spring/web";
import { useEffect } from "react";

import { useProofSeen } from "./use-proof-seen";

export const LOOP_HOLD = 2720;
export const LOOP_FADE = 360;
export const LOOP_GAP = 280;

export const phase = (t: number, start: number, length: number) =>
  Math.min(1, Math.max(0, (t - start) / length));

export const loopFade = (t: number, play: number) =>
  1 - easings.easeInOutQuad(phase(t, play + LOOP_HOLD, LOOP_FADE));

export const useProofLoop = <T extends Element>(play: number, delay = 0) => {
  const { ref, seen } = useProofSeen<T>();
  const reduced = useReducedMotion();
  const cycle = play + LOOP_HOLD + LOOP_FADE + LOOP_GAP;

  const [{ t }, api] = useSpring(() => ({ t: 0 }));

  const active = seen && !reduced;

  useEffect(() => {
    if (reduced) {
      api.set({ t: play });
      return;
    }
    if (!active) {
      api.stop();
      api.set({ t: 0 });
      return;
    }
    let alive = true;
    const run = async () => {
      let first = true;
      while (alive) {
        api.set({ t: 0 });
        const [result] = await Promise.all(
          api.start({
            t: cycle,
            delay: first ? delay : 0,
            config: { duration: cycle, easing: easings.linear },
          }),
        );
        if (!result || result.cancelled) break;
        first = false;
      }
    };
    void run();
    return () => {
      alive = false;
      api.stop();
    };
  }, [active, reduced, api, play, cycle, delay]);

  return { ref, t: t as SpringValue<number> };
};
