import type { Transition } from "framer-motion";
import { EASE_OUT } from "../components/motion/variants";

/**
 * Landing-page reveal timing. Content starts moving just before it reaches the
 * viewport and finishes quickly, so scrolling never waits on an animation.
 */
export const VIEWPORT_EARLY = { once: true, margin: "0px 0px 10% 0px" } as const;

export const REVEAL: Transition = { duration: 0.35, ease: EASE_OUT };
