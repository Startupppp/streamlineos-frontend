"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

type Props = {
  children: ReactNode;
  className?: string;
  max?: number;
  scaleOnHover?: number;
};

export function TiltCard({ children, className, max = 8, scaleOnHover = 1.02 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rx = useSpring(useTransform(y, [-0.5, 0.5], [`${max}deg`, `${-max}deg`]), {
    stiffness: 220,
    damping: 20,
  });
  const ry = useSpring(useTransform(x, [-0.5, 0.5], [`${-max}deg`, `${max}deg`]), {
    stiffness: 220,
    damping: 20,
  });

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        perspective: 1200,
        transformStyle: "preserve-3d",
        rotateX: rx,
        rotateY: ry,
      }}
      whileHover={{ scale: scaleOnHover }}
      transition={{ scale: { duration: 0.4, ease: "easeOut" } }}
      onMouseMove={(e) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        x.set((e.clientX - rect.left) / rect.width - 0.5);
        y.set((e.clientY - rect.top) / rect.height - 0.5);
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
