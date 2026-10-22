"use client";

import { InviewSeen } from "@/features/landing/relay/components/ui/inview-seen";
import { SPRING_SOFT } from "@/features/landing/relay/lib/motion";

export const PulseDot = ({ delay = 250 }: { delay?: number }) => (
  <span className="relative size-1.5 shrink-0 rounded-full bg-accent-marker">
    <InviewSeen
      tag="span"
      mode="once"
      aria-hidden="true"
      className="absolute inset-0 rounded-full border border-accent-marker"
      from={{ scale: 1, opacity: 0.8 }}
      to={{ scale: 2.6, opacity: 0 }}
      config={SPRING_SOFT}
      delayIn={delay}
    />
  </span>
);
