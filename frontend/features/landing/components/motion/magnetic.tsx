"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

type Props = {
  children: ReactNode;
  strength?: number;
  className?: string;
};

export function Magnetic({ children, strength = 0.4, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });
  const tx = useTransform(springX, (v) => `${v * strength}px`);
  const ty = useTransform(springY, (v) => `${v * strength}px`);

  return (
    <motion.div
      ref={ref}
      className={className ?? "inline-flex"}
      style={{ x: tx, y: ty }}
      onMouseMove={(e) => {
        // Magnetic tilt is pointer-only; skip work on coarse touch devices.
        if (window.matchMedia("(pointer: coarse)").matches) return;
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        x.set(e.clientX - rect.left - rect.width / 2);
        y.set(e.clientY - rect.top - rect.height / 2);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}
