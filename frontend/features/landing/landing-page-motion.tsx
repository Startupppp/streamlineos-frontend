"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { fadeUp, transitionBase } from "./components/motion/variants";

type LandingPageMotionProps = {
  children: ReactNode;
};

export function LandingPageMotion({ children }: LandingPageMotionProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      transition={{ ...transitionBase, duration: 0.35 }}
    >
      {children}
    </motion.div>
  );
}
