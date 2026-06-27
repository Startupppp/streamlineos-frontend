"use client";

import type { ReactNode } from "react";
import { MotionReveal } from "./motion/motion-reveal";

type PricingAnimatedBlockProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function PricingAnimatedBlock({
  children,
  className,
  delay = 0,
}: PricingAnimatedBlockProps) {
  return (
    <MotionReveal delay={delay} className={className}>
      {children}
    </MotionReveal>
  );
}
