import type { Transition, Variants } from "framer-motion";

export const PM_EASE = [0.22, 1, 0.36, 1] as const;

export const pmFast: Transition = {
  duration: 0.16,
  ease: PM_EASE,
};

export const pmSnappy: Transition = {
  duration: 0.2,
  ease: PM_EASE,
};

export const pmSpring: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 32,
  mass: 0.7,
};

export function pmStagger(index: number, step = 0.04): Transition {
  return {
    duration: 0.18,
    ease: PM_EASE,
    delay: Math.min(index * step, 0.32),
  };
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

export const fadeUpReduced: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  show: { opacity: 1, scale: 1 },
};

export const listContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.035,
      delayChildren: 0.04,
    },
  },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 6, x: -2 },
  show: { opacity: 1, y: 0, x: 0 },
};

export const listItemReduced: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

export const viewSwap: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const viewSwapReduced: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const dropHighlight: Variants = {
  idle: { backgroundColor: "transparent" },
  over: { backgroundColor: "color-mix(in srgb, var(--primary) 6%, transparent)" },
};
