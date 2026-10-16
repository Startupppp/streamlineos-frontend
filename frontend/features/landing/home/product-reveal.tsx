"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { BRAND_NAME } from "@/lib/branding";
import { Frame } from "./frame";
import { HeroScreen } from "./hero-screen";

/**
 * The product rises out of the hero: it starts tilted back like a screen on a
 * desk and settles flat as it scrolls into view. Scroll-linked, so it never
 * plays on its own and simply sits flat when motion is reduced.
 */
export function ProductReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [22, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.9, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [60, 0]);

  return (
    <div className="relative -mt-8 px-3 sm:-mt-16 sm:px-6">
      <div ref={ref} className="mx-auto max-w-6xl perspective-[1600px]">
        <motion.div style={{ rotateX, scale, y }} className="lp-fade-mobile origin-bottom">
          <Frame
            crumb="Today"
            label={`Mockup of a ${BRAND_NAME} workspace: sales pipeline, projects, attendance and payroll, receivables, support tickets and timesheets on one screen, with the same customer highlighted in each.`}
          >
            <HeroScreen />
          </Frame>
        </motion.div>
      </div>
    </div>
  );
}
