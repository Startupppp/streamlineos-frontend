"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { fadeUp, transitionBase } from "./motion/variants";

type PublicMainProps = {
  children: ReactNode;
  className?: string;
};

export function PublicMain({ children, className }: PublicMainProps) {
  return (
    <motion.main
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      transition={{ ...transitionBase, duration: 0.4 }}
      className={`flex-1 pt-28 pb-16 lg:pt-32 lg:pb-24 ${className ?? ""}`}
    >
      {children}
    </motion.main>
  );
}
