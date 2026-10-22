"use client";

import { animated, to, useSpring, type SpringValue } from "@react-spring/web";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

import { pick, useFrame } from "@/features/landing/relay/hooks/use-frame";
import { SPRING_SOFT } from "@/features/landing/relay/lib/motion";

import { TILT } from "./timeline";

type Pointer = { x: SpringValue<number>; y: SpringValue<number> };

const TiltContext = createContext<Pointer | null>(null);

const usePointer = () => {
  const pointer = useContext(TiltContext);
  if (!pointer) throw new Error("Hero tilt layer outside <HeroTilt>");
  return pointer;
};

const ANCHOR: Record<1440 | 768 | 390, { x: number; y: number }> = {
  1440: { x: 1100 / 1440, y: 0.5 },
  768: { x: 0.5, y: 649 / 976 },
  390: { x: 0.5, y: 679.5 / 949 },
};

export const HeroTilt = ({ children }: { children: ReactNode }) => {
  const [{ x, y }, api] = useSpring(() => ({ x: 0, y: 0, config: SPRING_SOFT }));
  const anchor = pick(useFrame(), ANCHOR);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hero = document.getElementById("hero");
    if (!hero || !fine.matches || reduce.matches) return;

    const reset = () => api.start({ x: 0, y: 0 });
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = hero.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      ) {
        reset();
        return;
      }
      let nx = (e.clientX - (r.left + r.width * anchor.x)) / (r.width / 2);
      let ny = (e.clientY - (r.top + r.height * anchor.y)) / (r.height / 2);
      const len = Math.hypot(nx, ny);
      if (len > 1) {
        nx /= len;
        ny /= len;
      }
      api.start({
        x: Math.round(nx * 1000) / 1000,
        y: Math.round(ny * 1000) / 1000,
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", reset);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", reset);
      window.removeEventListener("blur", reset);
    };
  }, [anchor, api]);

  const pointer = useMemo(() => ({ x, y }), [x, y]);
  return (
    <TiltContext.Provider value={pointer}>{children}</TiltContext.Provider>
  );
};

export const TiltGroup = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => {
  const { x, y } = usePointer();
  return (
    <animated.div
      className={`origin-[76.3889%_50%] w768:origin-[50%_66.5%] w390:origin-[50%_71.6%] ${className}`}
      style={{
        transform: to([x, y], (px, py) =>
          px === 0 && py === 0
            ? "none"
            : `perspective(${TILT.perspective}px) rotateX(${-py * TILT.deg}deg) rotateY(${px * TILT.deg}deg)`,
        ),
      }}
    >
      {children}
    </animated.div>
  );
};

export const DepthLayer = ({
  depth,
  children,
  className = "",
}: {
  depth: number;
  children: ReactNode;
  className?: string;
}) => {
  const { x, y } = usePointer();
  return (
    <animated.div
      className={className}
      style={{
        transform: to([x, y], (px, py) =>
          px === 0 && py === 0
            ? "none"
            : `translate3d(${px * depth}px, ${py * depth}px, 0)`,
        ),
      }}
    >
      {children}
    </animated.div>
  );
};
