"use client";

import { animated, useSpring } from "@react-spring/web";
import Image from "next/image";
import type { CSSProperties } from "react";

import { SPRING_SOFT } from "@/features/landing/relay/lib/motion";

import type { RegionsPhase } from "./use-regions-cycle";

export interface LaneBarProps {
  fillWidthClassName: string;
  fillClassName: string;
  share: string;
  delay: number;
  phase: RegionsPhase;
  reduced: boolean;
}

const SOFT_FAST = {
  tension: SPRING_SOFT.tension * 1.5,
  friction: SPRING_SOFT.friction * 1.22,
} as const;
const GROW = { ...SOFT_FAST, clamp: true } as const;

export const LaneBar = ({
  fillWidthClassName,
  fillClassName,
  share,
  delay,
  phase,
  reduced,
}: LaneBarProps) => {
  const on = phase === "play";

  const target = Number.parseInt(share, 10);
  const suffix = share.slice(String(target).length);

  const [{ pulse }, pulseApi] = useSpring(() => ({
    pulse: 0,
    config: SOFT_FAST,
  }));

  const { grow } = useSpring({
    from: { grow: 0 },
    to: { grow: on ? 1 : 0 },
    delay: phase === "off" || reduced ? 0 : delay,
    immediate: phase === "off" || reduced,
    config: GROW,
    onRest: ({ value, finished }) => {
      if (finished && value.grow === 1 && !reduced) {
        pulseApi.start({ from: { pulse: 0 }, to: { pulse: 1 } });
      }
    },
  });

  return (
    <animated.span
      style={{ "--lane-grow": grow.to((g) => String(g)) } as CSSProperties}
      className={`contents [--lane-head:0.3125rem] [--lane-x:16.375rem] w1024:[--lane-x:12.375rem] w768:[--lane-x:23.625rem] w390:[--lane-head:0.15625rem] w390:[--lane-x:9.875rem] ${fillWidthClassName}`}
    >
      <span
        aria-hidden="true"
        className="absolute top-1.5 left-(--lane-x) block h-2.5 w-65.5 overflow-clip rounded-full bg-scale-lane w1024:top-1.25 w1024:w-37.5 w768:w-55 w390:top-[calc(var(--spacing)*3.875)] w390:h-1.25 w390:w-27.5"
      >
        <span
          className={`absolute inset-y-0 left-0 block w-[calc(var(--lane-grow)*var(--lane-fill))] ${fillClassName}`}
        />
      </span>
      <span
        aria-hidden="true"
        className="absolute top-1.5 left-[calc(var(--lane-x)+var(--lane-grow)*var(--lane-fill)-var(--lane-head))] block size-2.5 w1024:top-1.25 w390:top-[calc(var(--spacing)*3.875)] w390:size-1.25"
      >
        <Image
          src="/landing/relay/scale/scale-bar-head.svg"
          alt=""
          width={10}
          height={10}
          className="block size-2.5 w390:size-1.25"
        />
        <animated.span
          className="absolute inset-0 rounded-full border border-foreground"
          style={{
            scale: pulse.to((p) => 1 + 1.6 * p),
            opacity: pulse.to((p) => (p > 0 && p < 1 ? 0.8 * (1 - p) : 0)),
          }}
        />
      </span>
      <span className="absolute top-0 right-0 text-right whitespace-nowrap font-mono text-scale-mono leading-scale-mono text-foreground tabular-nums w390:top-2.5">
        <span className="sr-only">{share}</span>
        <animated.span aria-hidden="true">
          {grow.to((g) => `${Math.round(g * target)}${suffix}`)}
        </animated.span>
      </span>
    </animated.span>
  );
};
