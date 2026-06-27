"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { fadeIn, transitionBase } from "./variants";

type Props = {
  children: ReactNode;
  speed?: number;
  className?: string;
  reverse?: boolean;
};

export function Marquee({ children, speed = 32, className, reverse }: Props) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-5% 0px" }}
      variants={fadeIn}
      transition={{ ...transitionBase, duration: 0.7 }}
      className={`relative overflow-hidden ${className ?? ""}`}
    >
      <div
        className="marquee-track"
        style={{
          animationDuration: `${speed}s`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {children}
        {children}
      </div>
    </motion.div>
  );
}
