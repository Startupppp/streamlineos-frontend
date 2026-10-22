"use client";

import { animated, useSpring } from "@react-spring/web";
import { useEffect, useState } from "react";

const INTERACTIVE =
  "a, button, input, textarea, select, label, [role='button'], [role='radio'], [role='slider']";

const RING = 28;
const RING_OVER = 44;
const PRESS = 0.82;
const FOLLOW = { tension: 210, friction: 24, mass: 1 } as const;
const SHAPE = { tension: 400, friction: 30 } as const;
const OFFSCREEN = { x: -200, y: -200 };

export const CursorDot = () => {
  const [enabled, setEnabled] = useState(false);
  const [over, setOver] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [down, setDown] = useState(false);
  const [follow, api] = useSpring(() => ({
    ...OFFSCREEN,
    config: FOLLOW,
  }));

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduce.matches) return;
    setEnabled(true);
    let seen = false;
    let wasOver = false;
    let wasHidden = false;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      api.start({ x: e.clientX, y: e.clientY, immediate: !seen });
      seen = true;
      const target = e.target as Element | null;
      const isOver = !!target?.closest?.(INTERACTIVE);
      if (isOver !== wasOver) {
        wasOver = isOver;
        setOver(isOver);
      }
      const isHidden = !!target?.closest?.("[data-cursor='none']");
      if (isHidden !== wasHidden) {
        wasHidden = isHidden;
        setHidden(isHidden);
      }
    };
    const press = () => setDown(true);
    const release = () => setDown(false);
    const leave = () => {
      seen = false;
      api.start({ ...OFFSCREEN, immediate: true });
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", press, { passive: true });
    window.addEventListener("pointerup", release, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", press);
      window.removeEventListener("pointerup", release);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [api]);

  const shape = useSpring({
    size: over ? RING_OVER : RING,
    fill: over ? 0.12 : 0,
    press: hidden ? 0 : down ? PRESS : 1,
    config: SHAPE,
  });

  if (!enabled) return null;
  return (
    <animated.div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-50 rounded-full border border-accent will-change-transform"
      style={{
        x: follow.x,
        y: follow.y,
        width: shape.size,
        height: shape.size,
        translateX: "-50%",
        translateY: "-50%",
        scale: shape.press,
      }}
    >
      <animated.span
        className="absolute inset-0 rounded-full bg-accent"
        style={{ opacity: shape.fill }}
      />
    </animated.div>
  );
};
