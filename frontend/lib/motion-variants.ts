import { useEffect, useState } from "react";
import type { Variants } from "framer-motion";
import { useReducedMotion } from "framer-motion";

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

const reducedFade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const reducedStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0 },
  },
};

export function useMotionVariants() {
  const prefersReduced = useReducedMotion();
  const [motionReady, setMotionReady] = useState(false);

  useEffect(() => {
    setMotionReady(true);
  }, []);

  const reduce = motionReady && Boolean(prefersReduced);
  return {
    staggerContainer: reduce ? reducedStagger : staggerContainer,
    fadeUp: reduce ? reducedFade : fadeUp,
    fadeIn: reduce ? reducedFade : fadeIn,
    slideInLeft: reduce ? reducedFade : slideInLeft,
    scaleIn: reduce ? reducedFade : scaleIn,
  };
}
