"use client";

import { InviewSeen } from "@/features/landing/relay/components/ui/inview-seen";
import { SPRING_SOFT } from "@/features/landing/relay/lib/motion";

export const DrawLine = ({
  className = "",
  delay = 0,
}: {
  className?: string;
  delay?: number;
}) => (
  <InviewSeen
    tag="span"
    mode="once"
    aria-hidden="true"
    className={`block origin-left ${className}`}
    from={{ scaleX: 0 }}
    to={{ scaleX: 1 }}
    config={SPRING_SOFT}
    delayIn={delay}
  />
);
