"use client";

import { animated, type SpringValue, useSpring } from "@react-spring/web";
import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import type { IntegrationsApp } from "@/features/landing/relay/data/integrations";
import { type Frame, pick, useFrame } from "@/features/landing/relay/hooks/use-frame";
import { SPRING_SOFT } from "@/features/landing/relay/lib/motion";

import { VIEW_MARGIN } from "@/features/landing/relay/lib/view";

import { AppTile } from "./app-tile";

type Rail = {
  tile: number;
  tileX: number;
  pitch: number;
  railX: number;
  railW: number;
  rest: number;
  dashOffset: number;
};

const WIDE: Rail = {
  tile: 60,
  tileX: 80,
  pitch: 174,
  railX: 90,
  railW: 1260,
  rest: 217,
  dashOffset: 1,
};

const NARROW: Rail = {
  tile: 60,
  tileX: 48,
  pitch: 173.6,
  railX: 58,
  railW: 908,
  rest: 165,
  dashOffset: 0,
};

const TABLET: Rail = {
  tile: 60,
  tileX: 40,
  pitch: 125.6,
  railX: 50,
  railW: 668,
  rest: 133,
  dashOffset: 0,
};

const PHONE: Rail = {
  tile: 56,
  tileX: 20,
  pitch: 98,
  railX: 28,
  railW: 334,
  rest: 97,
  dashOffset: 0,
};

const drawnIn = (frame: Frame, app: IntegrationsApp) =>
  pick(frame, { 1440: true, 1024: app.in1024, 390: app.in390 });

const center = (g: Rail, i: number) => g.tileX + i * g.pitch + g.tile / 2;
const tileLeft = (g: Rail, i: number) => g.tileX + i * g.pitch;

const DRAW_MS = 1760;
const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

type Step = {
  x: number;
  o: number;
  active: number | null;
  move: number;
  wait: number;
  jump?: boolean;
  easing?: (t: number) => number;
  fade?: number;
};

const RUN = 5600;
const EASE_IN = 0.18;
const glide = (t: number) => {
  const k = 1 / (1 - EASE_IN / 2);
  return t < EASE_IN ? (k * t * t) / (2 * EASE_IN) : k * (t - EASE_IN / 2);
};

const lap = (g: Rail, count: number): Step[] => {
  const end = center(g, count - 1);
  const start = center(g, 0);
  return [
    { x: start, o: 0, active: 0, move: 0, wait: 30, jump: true },
    {
      x: end,
      o: 1,
      active: null,
      move: RUN,
      fade: 360,
      wait: RUN + 200,
      easing: glide,
    },
    { x: end, o: 0, active: count - 1, move: 360, wait: 380 },
  ];
};

const LOOP_FROM = 0;

const nearest = (g: Rail, count: number, x: number) =>
  Math.min(
    count - 1,
    Math.max(0, Math.floor((x - g.tileX + g.tile * 0.4) / g.pitch)),
  );

type RailLayersProps = {
  geometry: Rail;
  drawP: SpringValue<number>;
  packetX: SpringValue<number>;
  packetO: SpringValue<number>;
};

const RAIL_BACK = 0.1001;

const underTiles = (g: Rail, count: number, width: number) => {
  const pc = (v: number) => `${((v / width) * 100).toFixed(3)}%`;
  const stops = ["black 0%"];
  for (let i = 0; i < count; i++) {
    const l = g.tileX + i * g.pitch;
    stops.push(
      `black ${pc(l)}`,
      `transparent ${pc(l)}`,
      `transparent ${pc(l + g.tile)}`,
      `black ${pc(l + g.tile)}`,
    );
  }
  stops.push("black 100%");
  return `linear-gradient(to right, ${stops.join(", ")})`;
};

const RailLayers = ({
  geometry,
  drawP,
  packetX,
  packetO,
  count,
  frame,
}: RailLayersProps & { count: number; frame: Frame }) => {
  const { railX, railW, rest, dashOffset } = geometry;
  const mask = underTiles(geometry, count, frame);
  const at = (x: number) => (x - railX) / railW;
  const from = (x: number) => Math.max(0, at(x) - RAIL_BACK);
  const peak = (x: number) => Math.min(1, Math.max(0, at(x)));
  const to = (x: number) => Math.min(1, at(x) + (1 - RAIL_BACK));
  const idle = {
    stopColor: "var(--integrations-rail-idle)",
    stopOpacity: "var(--integrations-rail-alpha)",
  };

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    >
      <animated.div
        className="absolute top-47.5 left-22.5 h-0.5 w-315 w1024:top-28.5 w1024:left-14.5 w1024:w-227 w768:top-30.25 w768:left-12.5 w768:w-167 w390:top-30.75 w390:left-7 w390:w-83.5"
        style={{
          clipPath: drawP.to((p) =>
            p >= 1 ? "none" : `inset(0 ${(1 - p) * 100}% 0 0)`,
          ),
        }}
      >
        <animated.svg
          aria-hidden="true"
          width={railW}
          height={2}
          viewBox={`0 0 ${railW} 2`}
          preserveAspectRatio="none"
          className="block h-0.5 w-full overflow-visible"
          style={{ "--lit": packetO } as unknown as CSSProperties}
        >
          <defs>
            <linearGradient
              id="integrations-rail"
              x1="0"
              y1="1"
              x2={railW}
              y2="1"
              gradientUnits="userSpaceOnUse"
            >
              <animated.stop offset={packetX.to(from)} style={idle} />
              <animated.stop
                offset={packetX.to(peak)}
                style={{
                  stopColor:
                    "color-mix(in srgb, var(--integrations-rail-lit) calc(var(--lit) * 100%), var(--integrations-rail-idle))",
                  stopOpacity: "var(--integrations-rail-alpha)",
                }}
              />
              <animated.stop offset={packetX.to(to)} style={idle} />
            </linearGradient>
          </defs>
          <path
            d={`M0 1H${railW}`}
            stroke="url(#integrations-rail)"
            strokeDasharray="2 8"
            strokeDashoffset={dashOffset}
          />
        </animated.svg>
      </animated.div>
      <animated.div
        className="absolute top-47 left-53.5 size-1.5 w1024:top-28 w1024:left-40.5 w768:top-29.75 w768:left-32.5 w390:top-30.25 w390:left-23.5"
        style={{
          opacity: packetO,
          transform: packetX.to((x) =>
            x === rest ? "none" : `translateX(${(x - rest) / 16}rem)`,
          ),
        }}
      >
        <Image
          src="/landing/relay/integrations/integrations-packet.svg"
          alt=""
          width={6}
          height={6}
          className="block size-1.5"
        />
      </animated.div>
    </div>
  );
};

export const IntegrationsRelay = ({
  apps,
}: {
  apps: readonly IntegrationsApp[];
}) => {
  const root = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLUListElement>(null);
  const [inView, setInView] = useState(false);
  const [started, setStarted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const frame = useFrame();
  const [drawn, setDrawn] = useState(0);
  const [step, setStep] = useState(-1);

  const geometry = pick(frame, {
    1440: WIDE,
    1024: NARROW,
    768: TABLET,
    390: PHONE,
  });
  const lanes = useMemo(() => {
    let next = 0;
    return apps.map((a) => (drawnIn(frame, a) ? next++ : -1));
  }, [apps, frame]);
  const count = useMemo(
    () => lanes.reduce((n, l) => (l >= 0 ? n + 1 : n), 0),
    [lanes],
  );
  const restTile = Math.max(0, lanes[apps.findIndex((a) => a.active)] ?? 0);
  const steps = useMemo(() => lap(geometry, count), [geometry, count]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      setInView(e.isIntersecting);
      if (e.isIntersecting) return;
      setStarted(false);
      setDrawn(0);
      setStep(-1);
    });
    io.observe(el);
    const seen = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setStarted(true);
      },
      { rootMargin: VIEW_MARGIN },
    );
    seen.observe(el);
    const rowSeen = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setStarted(true);
        rowSeen.disconnect();
      },
      { threshold: 1 },
    );
    if (row.current) rowSeen.observe(row.current);
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncRm = () => setReduced(rm.matches);
    syncRm();
    rm.addEventListener("change", syncRm);
    return () => {
      io.disconnect();
      seen.disconnect();
      rowSeen.disconnect();
      rm.removeEventListener("change", syncRm);
    };
  }, []);

  const draw = useSpring({
    p: started ? 1 : 0,
    config: { duration: DRAW_MS, easing: easeInOut },
    immediate: !started,
    onChange: ({ value }) => {
      const edge = geometry.railX + value.p * geometry.railW;
      let n = 0;
      while (n < count && tileLeft(geometry, n) <= edge) n++;
      setDrawn((d) => Math.max(d, n));
    },
  });

  useEffect(() => {
    if (!started || reduced) return;
    setStep((k) => (k < 0 ? 0 : k));
    const t = setTimeout(() => setDrawn(count), DRAW_MS + 160);
    return () => clearTimeout(t);
  }, [started, reduced, count]);

  useEffect(() => {
    setStep((k) => (k >= steps.length ? 0 : k));
    setDrawn((d) => Math.min(d, count));
  }, [steps.length, count]);

  useEffect(() => {
    if (reduced) {
      setStep(-1);
      return;
    }
    if (step < 0 || step >= steps.length || !inView) return;
    const t = setTimeout(() => {
      setStep(step + 1 < steps.length ? step + 1 : LOOP_FROM);
    }, steps[step].wait);
    return () => clearTimeout(t);
  }, [step, steps, inView, reduced]);

  const shown = drawn > restTile || (reduced && started);
  const current = step >= 0 && step < steps.length ? steps[step] : null;

  const [passing, setPassing] = useState(restTile);
  const packet = useSpring(
    current
      ? {
          x: current.x,
          o: current.o,
          immediate: current.jump || !started,
          config: (key: string) =>
            key === "o" && current.fade
              ? { duration: current.fade }
              : current.move
                ? { duration: current.move, easing: current.easing }
                : SPRING_SOFT,
          onChange: ({ value }: { value: { x: number } }) => {
            if (current.active !== null) return;
            const lit = nearest(geometry, count, value.x);
            setPassing((prev) => (prev === lit ? prev : lit));
          },
        }
      : {
          x: geometry.rest,
          o: shown ? 1 : 0,
          immediate: !started,
          config: SPRING_SOFT,
        },
  );

  const { x: packetX, o: packetO } = packet as {
    x: SpringValue<number>;
    o: SpringValue<number>;
  };

  const active = current ? (current.active ?? passing) : restTile;

  return (
    <div ref={root} className="absolute inset-0">
      
      <RailLayers
        geometry={geometry}
        drawP={draw.p}
        packetX={packetX}
        packetO={packetO}
        count={count}
        frame={frame}
      />

      <ul
        ref={row}
        className="absolute top-40 left-20 flex gap-28.5 w1024:top-21 w1024:left-12 w1024:gap-[calc(var(--spacing)*28.4)] w768:top-23 w768:left-10 w768:gap-[calc(var(--spacing)*16.4)] w390:top-24 w390:left-5 w390:gap-10.5"
      >
        {apps.map((app, i) => {
          const lane = lanes[i];
          return (
            <AppTile
              key={app.name}
              name={app.name}
              initials={app.initials}
              align={
                lane === 0 ? "start" : lane === count - 1 ? "end" : "center"
              }
              in1024={app.in1024}
              in390={app.in390}
              shown={reduced ? started : lane >= 0 && lane < drawn}
              active={lane >= 0 && lane === active}
            />
          );
        })}
      </ul>
    </div>
  );
};
