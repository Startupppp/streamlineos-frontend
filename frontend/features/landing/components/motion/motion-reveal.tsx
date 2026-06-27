"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import {
  fadeUp,
  fadeIn,
  scaleIn,
  slideLeft,
  slideRight,
  staggerContainer,
  staggerItem,
  transitionBase,
  VIEWPORT_DEFAULT,
} from "./variants";

type RevealVariant = "fadeUp" | "fadeIn" | "scaleIn" | "slideLeft" | "slideRight";

const VARIANT_MAP = {
  fadeUp,
  fadeIn,
  scaleIn,
  slideLeft,
  slideRight,
} as const;

type MotionRevealProps = HTMLMotionProps<"div"> & {
  variant?: RevealVariant;
  delay?: number;
};

export function MotionReveal({
  variant = "fadeUp",
  delay = 0,
  children,
  ...props
}: MotionRevealProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT_DEFAULT}
      variants={VARIANT_MAP[variant]}
      transition={{ ...transitionBase, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

type MotionStaggerProps = HTMLMotionProps<"div">;

export function MotionStagger({ children, ...props }: MotionStaggerProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT_DEFAULT}
      variants={staggerContainer}
      {...props}
    >
      {children}
    </motion.div>
  );
}

type MotionItemProps = HTMLMotionProps<"div">;

export function MotionItem({ children, ...props }: MotionItemProps) {
  return (
    <motion.div variants={staggerItem} {...props}>
      {children}
    </motion.div>
  );
}
