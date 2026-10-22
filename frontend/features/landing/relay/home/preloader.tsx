"use client";

import { animated, easings, useSpring } from "@react-spring/web";
import Image from "next/image";
import { useEffect, useLayoutEffect, useState } from "react";

import { TILE_ROUND } from "./transitions/fold";

const MAX_WAIT = 6000;
const TILE = 76;
const RING_INSET = 8;
const RING_ROUND = 24;
const DRAW = { tension: 60, friction: 22 } as const;
const FLOOD = { tension: 140, friction: 26 } as const;
const CLOSE = { duration: 1000, easing: easings.easeInOutQuad } as const;
const CLOSED = 0.96;
const FULL = 0.97;

type Phase = "draw" | "flood" | "fold" | "done";
type Box = { w: number; h: number; k: number };

export const Preloader = () => {
  const [phase, setPhase] = useState<Phase>("draw");
  const [progress, setProgress] = useState(0.04);
  const [box, setBox] = useState<Box | null>(null);

  useLayoutEffect(() => {
    const root = document.documentElement;
    if ("preload" in root.dataset) root.dataset.preloadAway = "";
  }, []);

  useEffect(() => {
    if (!("preload" in document.documentElement.dataset)) {
      setPhase("done");
      return;
    }
    const measure = () => {
      const rem = parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      );
      setBox({ w: window.innerWidth, h: window.innerHeight, k: rem / 16 });
    };
    measure();
    window.addEventListener("resize", measure);

    const images = [...document.images].filter((img) => img.loading !== "lazy");
    const total = images.length + 1;
    let done = images.filter((img) => img.complete).length;
    let fonts = false;
    let alive = true;
    const push = () =>
      alive &&
      setProgress((v) => Math.max(v, 0.04 + 0.76 * ((done + +fonts) / total)));
    const onImage = () => {
      done += 1;
      push();
    };
    const pending = images.filter((img) => !img.complete);
    pending.forEach((img) => {
      img.addEventListener("load", onImage, { once: true });
      img.addEventListener("error", onImage, { once: true });
    });
    document.fonts.ready.then(() => {
      fonts = true;
      push();
    });
    push();
    const onLoad = () => alive && setProgress(1);
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);
    const timer = window.setTimeout(onLoad, MAX_WAIT);
    return () => {
      alive = false;
      pending.forEach((img) => {
        img.removeEventListener("load", onImage);
        img.removeEventListener("error", onImage);
      });
      window.removeEventListener("resize", measure);
      window.removeEventListener("load", onLoad);
      window.clearTimeout(timer);
    };
  }, []);

  const { d } = useSpring({
    from: { d: 0 },
    to: { d: box ? progress : 0 },
    config: DRAW,
    onChange: ({ value }) => {
      if (phase === "draw" && value.d >= CLOSED) setPhase("flood");
    },
  });

  const { k } = useSpring({
    k: phase === "draw" ? 0 : 1,
    config: FLOOD,
    onChange: ({ value }) => {
      if (phase === "flood" && value.k >= FULL) setPhase("fold");
    },
  });

  const { c } = useSpring({
    c: phase === "fold" ? 1 : 0,
    config: CLOSE,
    onRest: ({ value }) => {
      if (phase === "fold" && value.c >= 1) setPhase("done");
    },
  });

  useEffect(() => {
    const root = document.documentElement;
    if (phase === "fold") root.dataset.preloadClosing = "";
    if (phase === "fold" || phase === "done") delete root.dataset.preload;
    if (phase === "done") {
      delete root.dataset.preloadClosing;
      delete root.dataset.preloadAway;
    }
  }, [phase]);
  useEffect(
    () => () => {
      delete document.documentElement.dataset.preloadClosing;
    },
    [],
  );

  if (phase === "done") return null;

  const folding = phase === "fold";
  const tile = box ? TILE * box.k : 0;
  const inset = box ? RING_INSET * box.k : 0;
  const reach = box ? Math.ceil(Math.max(box.w, box.h) / 2) + 2 : 0;
  const half = (v: number) => (box ? (1 - v) * (Math.max(box.w, box.h) / 2) : 0);
  const mask = (v: number) => {
    if (!box) return "none";
    const H = half(v);
    const hw = Math.min(H, box.w / 2);
    const hh = Math.min(H, box.h / 2);
    const side = Math.min(hw, hh) * 2;
    const squared = Math.max(box.w, box.h) === Math.min(box.w, box.h)
      ? 1
      : Math.min(
          1,
          Math.max(0, (Math.max(box.w, box.h) / 2 - H) /
            ((Math.max(box.w, box.h) - Math.min(box.w, box.h)) / 2)),
        );
    const round = side * TILE_ROUND * squared;
    return `inset(${box.h / 2 - hh}px ${box.w / 2 - hw}px round ${round}px)`;
  };
  const cut = (v: number) => {
    const side = half(v) * 2;
    if (side >= tile) return "none";
    const e = (tile - side) / 2;
    return `inset(${e}px round ${side * TILE_ROUND}px)`;
  };

  return (
    <div
      data-preloader
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-60 hidden"
      style={folding ? { display: "block" } : undefined}
    >
      
      {!folding && <div className="absolute inset-0 bg-background" />}

      {box && !folding && (
        <>
          
          <svg
            className="absolute inset-0 size-full"
            viewBox={`0 0 ${box.w} ${box.h}`}
            fill="none"
          >
            <animated.rect
              x={inset}
              y={inset}
              width={box.w - 2 * inset}
              height={box.h - 2 * inset}
              rx={RING_ROUND * box.k}
              pathLength={100}
              strokeDasharray="100 100"
              strokeDashoffset={d.to((v) => 100 * (1 - v))}
              className="stroke-accent"
              strokeWidth={2 * box.k}
              strokeLinecap="round"
            />
          </svg>
          
          <animated.div
            className="absolute inset-0"
            style={{
              opacity: k.to((v) => (v > 0 ? 1 : 0)),
              boxShadow: k.to(
                (v) =>
                  `inset 0 0 0 ${inset + v * (reach - inset)}px var(--statement-plate)`,
              ),
            }}
          />
        </>
      )}

      {folding && (
        <animated.div
          className="absolute inset-0 bg-statement-plate"
          style={{ clipPath: c.to(mask) }}
        />
      )}

      
      <animated.div
        className="absolute top-[calc(50%-2.375rem)] left-[calc(50%-2.375rem)] size-preloader-mark"
        style={{ clipPath: c.to(cut) }}
      >
        <Image
          src="/landing/relay/nav/nav-logo-mark.svg"
          alt=""
          width={28}
          height={28}
          className="absolute inset-0 size-full max-w-none"
          priority
        />
        <animated.span
          className="logo-open-fly absolute inset-0"
          style={{
            opacity: folding ? 1 : k,
          }}
        >
          <Image
            src="/landing/relay/statement/statement-mark-glyph.svg"
            alt=""
            width={34}
            height={37}
            className="absolute top-[24.3%] left-[28.25%] h-[48.76%] w-[44.1%] max-w-none"
            priority
          />
        </animated.span>
      </animated.div>
    </div>
  );
};
