"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
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
import type { Variants } from "framer-motion";

type RevealVariant = "fadeUp" | "fadeIn" | "scaleIn" | "slideLeft" | "slideRight";

const FULL_VARIANT_MAP: Record<RevealVariant, Variants> = {
  fadeUp,
  fadeIn,
  scaleIn,
  slideLeft,
  slideRight,
};

const REDUCED_REVEAL: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const REDUCED_STAGGER: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0 },
  },
};

const REDUCED_ITEM: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

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
  const prefersReduced = useReducedMotion();
  const variantSet = prefersReduced ? REDUCED_REVEAL : FULL_VARIANT_MAP[variant];
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT_DEFAULT}
      variants={variantSet}
      transition={{ ...transitionBase, delay: prefersReduced ? 0 : delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

type MotionStaggerProps = HTMLMotionProps<"div">;

export function MotionStagger({ children, ...props }: MotionStaggerProps) {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT_DEFAULT}
      variants={prefersReduced ? REDUCED_STAGGER : staggerContainer}
      {...props}
    >
      {children}
    </motion.div>
  );
}

type MotionItemProps = HTMLMotionProps<"div">;

export function MotionItem({ children, ...props }: MotionItemProps) {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div variants={prefersReduced ? REDUCED_ITEM : staggerItem} {...props}>
      {children}
    </motion.div>
  );
}
