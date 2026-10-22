"use client";

import { animated, useSpring } from "@react-spring/web";
import { useEffect, useState } from "react";

import { useRobot } from "@/features/landing/relay/components/common/robot-view";

export const BreathingDot = () => {
  const [motionOn, setMotionOn] = useState(false);
  const robot = useRobot();
  const pulse = motionOn && !robot;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotionOn(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const dot = useSpring({
    from: { scale: 1 },
    to: pulse ? [{ scale: 1.35 }, { scale: 1 }, { scale: 1 }] : { scale: 1 },
    loop: pulse,
    config: { duration: 600 },
  });

  const halo = useSpring({
    from: { scale: 1, opacity: 0.8 },
    to: pulse
      ? [
          { scale: 3, opacity: 0 },
          { scale: 1, opacity: 0.8, immediate: true },
        ]
      : { scale: 1, opacity: 0 },
    loop: pulse,
    config: { duration: 1800 },
  });

  return (
    <span className="relative size-1.5 shrink-0">
      <animated.span
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-accent"
        style={halo}
      />
      <animated.span
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-accent"
        style={dot}
      />
    </span>
  );
};
