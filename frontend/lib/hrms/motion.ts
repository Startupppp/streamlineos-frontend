import type { Transition, Variants } from "framer-motion";
import { PM_EASE } from "@/lib/motion-presets";

export const HRMS_DURATION_XS = 0.1;
export const HRMS_DURATION_SM = 0.16;
export const HRMS_DURATION_MD = 0.4;

export const hrmsXs: Transition = { duration: HRMS_DURATION_XS, ease: PM_EASE };
export const hrmsSm: Transition = { duration: HRMS_DURATION_SM, ease: PM_EASE };
export const hrmsMd: Transition = { duration: HRMS_DURATION_MD, ease: PM_EASE };
export const hrmsInstant: Transition = { duration: 0 };

export const HRMS_LIST_STAGGER_CAP = 6;

export function hrmsListStagger(index: number): Transition {
  return {
    duration: HRMS_DURATION_SM,
    ease: PM_EASE,
    delay: Math.min(index, HRMS_LIST_STAGGER_CAP) * 0.025,
  };
}

export const hrmsRowEnter: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0 },
};

export const hrmsRowEnterReduced: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

export const hrmsRowCollapse: Variants = {
  hidden: { opacity: 0, height: 0 },
  show: { opacity: 1, height: "auto" },
};

export const hrmsRowCollapseReduced: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

export const hrmsCanvasEnter: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

export const hrmsCanvasEnterReduced: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

export function hrmsTransition(reduced: boolean | null, transition: Transition): Transition {
  return reduced ? hrmsInstant : transition;
}

export function hrmsVariants(
  reduced: boolean | null,
  full: Variants,
  fallback: Variants,
): Variants {
  return reduced ? fallback : full;
}
