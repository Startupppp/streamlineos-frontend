"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { fadeUp, transitionBase, VIEWPORT_DEFAULT } from "./motion/variants";

type PublicEyebrowProps = { children: ReactNode };

export function PublicEyebrow({ children }: PublicEyebrowProps) {
  return (
    <motion.p
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT_DEFAULT}
      variants={fadeUp}
      transition={transitionBase}
      className="text-[13px] font-medium text-blue-600 mb-3"
    >
      {children}
    </motion.p>
  );
}
