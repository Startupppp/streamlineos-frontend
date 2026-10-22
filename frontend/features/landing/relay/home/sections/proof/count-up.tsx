"use client";

import {
  animated,
  easings,
  useReducedMotion,
  useSpring,
} from "@react-spring/web";
import { useEffect } from "react";

import { PROOF_TIMING } from "./timing";
import { useProofSeen } from "./use-proof-seen";

interface CountUpProps {
  value: string;
  className?: string;
  delay?: number;
}

export const CountUp = ({ value, className = "", delay = 0 }: CountUpProps) => {
  const { ref, seen } = useProofSeen<HTMLSpanElement>();
  const target = Number(value.replace(/[^\d.]/g, ""));
  const suffix = value.replace(/[\d,.]/g, "");
  const grouped = value.includes(",");

  const reduced = useReducedMotion();
  const [{ n }, api] = useSpring(() => ({ n: 0 }));

  useEffect(() => {
    if (reduced) {
      api.set({ n: target });
      return;
    }
    if (!seen) {
      api.stop();
      api.set({ n: 0 });
      return;
    }
    api.set({ n: 0 });
    api.start({
      n: target,
      delay,
      config: { duration: PROOF_TIMING.count, easing: easings.easeOutCubic },
    });
    return () => {
      api.stop();
    };
  }, [seen, reduced, api, target, delay]);

  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{value}</span>
      <animated.span
        aria-hidden="true"
        style={{
          fontVariantNumeric: n.to((v) =>
            Math.round(v) >= target ? "normal" : "tabular-nums",
          ),
        }}
      >
        {n.to((v) => {
          const rounded = Math.round(v);
          if (rounded >= target) return value;
          return `${grouped ? rounded.toLocaleString("en-US") : rounded}${suffix}`;
        })}
      </animated.span>
    </span>
  );
};
