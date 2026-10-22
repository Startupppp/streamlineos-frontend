"use client";

import {
  animated,
  easings,
  useSpring,
  type SpringValue,
} from "@react-spring/web";
import Image from "next/image";
import { useEffect, useState } from "react";

import { useFrame } from "@/features/landing/relay/hooks/use-frame";

import { StatementType } from "./plate";
import { POP, TIMELINE, useStatementSeen, WAVE } from "./use-statement-seen";

const HOUR_POSITIONS = [
  "left-20 w-20 text-left w1024:left-12 w768:left-10 w768:w-11 w390:left-5",
  "left-74 w-20 text-center w1024:left-47.25 w768:left-36.75 w768:w-11 w390:left-21",
  "left-138 w-20 text-center w1024:left-82.75 w768:left-63.75 w768:w-11 w390:hidden",
  "left-202 w-20 text-center w1024:left-153.25 w768:left-117.25 w768:w-11 w390:left-65.5",
  "left-266 w-20 text-center w1024:left-188.75 w768:left-144.25 w768:w-11 w390:left-81.5 w390:text-right",
  "left-320 w-20 text-right w1024:left-224 w768:left-171 w768:w-11 w390:hidden",
] as const;

const RULER_WIDTH = { 1440: 1280, 1024: 928, 768: 688, 390: 350 } as const;

const SLOTS = 121;
const NOW_SLOT = 60;
const ticksFor = (width: number) =>
  Array.from({ length: SLOTS }, (_, i) => ({
    i,
    p: i / (SLOTS - 1),
    x: Number((1 + (i * width) / (SLOTS - 1)).toPrecision(6)),
    top: i % 12 === 0 ? 0 : i % 6 === 0 ? 7 : 12,
    width: i % 12 === 0 ? 2 : 1,
  })).filter((t) => t.i !== NOW_SLOT);
const TICKS = {
  1440: ticksFor(RULER_WIDTH[1440]),
  1024: ticksFor(RULER_WIDTH[1024]),
  768: ticksFor(RULER_WIDTH[768]),
  390: ticksFor(RULER_WIDTH[390]),
} as const;

const HOUR_SLOT = 24;
const NOW_P = NOW_SLOT / (SLOTS - 1);

const TICK_REST = 0.35;
const TICK_PEAK = 0.75;
const WAVE_FROM = -0.12;
const WAVE_TO = 1.12;
const CREST = 0.06;
const EDGE = 0.03;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const crest = (wave: number, p: number) => {
  const d = Math.abs(wave - p) / CREST;
  return d >= 1 ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * d);
};

export interface RulerProps {
  caption: string;
  now: string;
  hours: readonly string[];
}

export const Ruler = ({ caption, now, hours }: RulerProps) => {
  const { seen, inView, reduced } = useStatementSeen();
  const frame = useFrame();
  const span = RULER_WIDTH[frame] + 2;
  const [shown, setShown] = useState(false);
  if (!seen && shown) setShown(false);

  const [{ wave }, api] = useSpring(() => ({ wave: WAVE_FROM }));

  const pop = useSpring({
    from: { scale: 0 },
    to: { scale: seen ? 1 : 0 },
    delay: reduced ? 0 : TIMELINE.nowPop,
    config: POP,
    immediate: reduced || !seen,
  });

  useEffect(() => {
    if (!seen) {
      api.stop();
      api.set({ wave: WAVE_FROM });
      return;
    }
    if (reduced) {
      api.set({ wave: WAVE_TO });
      setShown(true);
      return;
    }
    if (!shown) {
      const id = setTimeout(() => {
        api.start({
          from: { wave: WAVE_FROM },
          to: { wave: WAVE_TO },
          config: { duration: WAVE.pass, easing: easings.linear },
          onRest: () => setShown(true),
        });
      }, TIMELINE.wave);
      return () => clearTimeout(id);
    }
    if (!inView) return;
    let id: ReturnType<typeof setTimeout>;
    const pass = () => {
      api.start({
        from: { wave: WAVE_FROM },
        to: { wave: WAVE_TO },
        config: { duration: WAVE.pass, easing: easings.easeInOutSine },
        onRest: ({ finished }) => {
          if (finished) id = setTimeout(pass, WAVE.hold);
        },
      });
    };
    id = setTimeout(pass, WAVE.hold);
    return () => {
      clearTimeout(id);
      api.stop();
      api.set({ wave: WAVE_TO });
    };
  }, [seen, shown, inView, reduced, api]);

  const reveal = (w: number, p: number) =>
    shown ? 1 : clamp01((w - p + EDGE) / EDGE);

  const tickStyle = (p: number) => ({
    opacity: wave.to(
      (w) => reveal(w, p) * (TICK_REST + (TICK_PEAK - TICK_REST) * crest(w, p)),
    ),
    scaleY: wave.to(
      (w) => (0.2 + 0.8 * reveal(w, p)) * (1 + 0.5 * crest(w, p)),
    ),
  });

  const ringT = (w: SpringValue<number>) => w.to((v) => (v - NOW_P) / 0.22);
  const ring = {
    scale: ringT(wave).to((t) => 1 + 2.2 * clamp01(t)),
    opacity: ringT(wave).to((t) => (t > 0 && t < 1 ? 0.6 * (1 - t) : 0)),
  };
  const bump = { scale: wave.to((w) => 1 + 0.6 * crest(w, NOW_P)) };

  return (
    <>
      <p className="absolute top-112 left-20 h-5 font-mono text-relay-label leading-label whitespace-nowrap text-statement-ink-caption w1024:top-101.5 w1024:left-12 w768:top-99.5 w768:left-10 w390:top-[calc(var(--spacing)*61.25)] w390:left-5 w390:h-10 w390:w-19.75 w390:whitespace-normal">
        <StatementType delay={TIMELINE.caption}>{caption}</StatementType>
      </p>
      <svg
        aria-hidden="true"
        width={span}
        height="18"
        viewBox={`0 0 ${span} 18`}
        fill="none"
        className="absolute top-121 left-19.75 h-4.5 w-320.5 max-w-none overflow-visible text-on-accent w1024:top-112 w1024:left-11.75 w1024:w-232.5 w768:top-110.5 w768:left-9.75 w768:w-172.5 w390:top-[calc(var(--spacing)*75.25)] w390:left-4.75 w390:w-88"
      >
        {TICKS[frame].map((t) => (
          <animated.path
            key={t.i}
            d={`M${t.x} ${t.top}V18`}
            stroke="currentColor"
            strokeWidth={t.width}
            style={{
              ...tickStyle(t.p),
              transformBox: "fill-box",
              transformOrigin: "bottom",
            }}
          />
        ))}
      </svg>
      
      <animated.p
        style={{
          opacity: pop.scale.to((s) => Math.min(1, Math.max(0, s))),
          y: pop.scale.to((s) => (1 - Math.min(1, s)) * 6),
        }}
        className="absolute top-117.5 left-172.5 h-5 w-15 text-center font-mono text-relay-label leading-label text-on-accent w1024:top-119 w1024:left-120.5 w768:top-117 w768:left-92.75 w768:w-6.5 w390:top-[calc(var(--spacing)*82.75)] w390:left-45.5"
      >
        {now}
      </animated.p>
      <animated.span
        aria-hidden="true"
        style={pop}
        className="absolute top-123.25 left-178.75 size-2.5 w1024:top-110.25 w1024:left-126.75 w768:top-109.75 w768:left-95 w390:top-74.5 w390:left-47.5 w390:size-[calc(var(--spacing)*2.75)]"
      >
        <animated.span
          style={ring}
          className="absolute inset-0 rounded-full border border-statement-flash"
        />
        <animated.span style={bump} className="block size-full">
          <Image
            src="/landing/relay/statement/statement-now-node.svg"
            alt=""
            width={10}
            height={10}
            className="block size-full"
          />
        </animated.span>
      </animated.span>
      <ul aria-hidden="true">
        {hours.map((hour, i) => (
          <animated.li
            key={hour}
            style={{
              opacity: wave.to((w) => reveal(w, (i * HOUR_SLOT) / (SLOTS - 1))),
            }}
            className={`absolute top-127 h-5 font-mono text-relay-label leading-label text-statement-ink-muted w1024:top-119 w768:top-117 w390:top-[calc(var(--spacing)*82.75)] ${HOUR_POSITIONS[i]}`}
          >
            {hour}
          </animated.li>
        ))}
      </ul>
    </>
  );
};
