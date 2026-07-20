"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { transitionBase } from "./components/motion/variants";

type LandingPageMotionProps = {
  children: ReactNode;
};

export function LandingPageMotion({ children }: LandingPageMotionProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        ...transitionBase,
        duration: reduce ? 0 : 0.35,
      }}
      className="min-w-0"
    >
      {children}
    </motion.div>
  );
}
