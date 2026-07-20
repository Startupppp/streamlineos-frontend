import type { Transition, Variants } from "framer-motion";

export const PREVIEW_EASE = [0.22, 1, 0.36, 1] as const;

export function previewTransition(reduceMotion: boolean | null): Transition {
  return {
    duration: reduceMotion ? 0.01 : 0.2,
    ease: PREVIEW_EASE,
  };
}

export function previewLayoutTransition(reduceMotion: boolean | null): Transition {
  return {
    layout: {
      duration: reduceMotion ? 0.01 : 0.22,
      ease: PREVIEW_EASE,
    },
    opacity: {
      duration: reduceMotion ? 0.01 : 0.18,
      ease: PREVIEW_EASE,
    },
  };
}

export function staggerContainer(reduceMotion: boolean | null): Variants {
  return {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduceMotion ? 0 : 0.045,
        delayChildren: reduceMotion ? 0 : 0.02,
      },
    },
  };
}

export function fadeSlideItem(reduceMotion: boolean | null): Variants {
  return {
    hidden: {
      opacity: 0,
      y: reduceMotion ? 0 : 8,
      scale: reduceMotion ? 1 : 0.98,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: previewTransition(reduceMotion),
    },
    exit: {
      opacity: 0,
      y: reduceMotion ? 0 : -6,
      scale: reduceMotion ? 1 : 0.98,
      transition: { duration: reduceMotion ? 0.01 : 0.16, ease: PREVIEW_EASE },
    },
  };
}

export function sidebarItemVariants(reduceMotion: boolean | null): Variants {
  return {
    initial: {
      opacity: 0,
      x: reduceMotion ? 0 : -10,
    },
    animate: {
      opacity: 1,
      x: 0,
      transition: previewTransition(reduceMotion),
    },
    exit: {
      opacity: 0,
      x: reduceMotion ? 0 : -8,
      transition: { duration: reduceMotion ? 0.01 : 0.15, ease: PREVIEW_EASE },
    },
  };
}

export function chipVariants(reduceMotion: boolean | null): Variants {
  return {
    initial: {
      opacity: 0,
      scale: reduceMotion ? 1 : 0.92,
      y: reduceMotion ? 0 : 4,
    },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: previewTransition(reduceMotion),
    },
    exit: {
      opacity: 0,
      scale: reduceMotion ? 1 : 0.94,
      transition: { duration: reduceMotion ? 0.01 : 0.14, ease: PREVIEW_EASE },
    },
  };
}
