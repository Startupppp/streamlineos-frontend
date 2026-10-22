"use client";

import type { AriaAttributes, ReactNode } from "react";

import { InviewSeen } from "@/features/landing/relay/components/ui/inview-seen";
import { FADE, REVEAL, SPRING, SPRING_SOFT } from "@/features/landing/relay/lib/motion";
import type { Tags } from "@/features/landing/relay/types/springs";

export interface RevealProps extends AriaAttributes {
  children?: ReactNode;
  tag?: Tags;
  variant?: "rise" | "fade";
  delay?: number;
  className?: string;
  id?: string;
}

const PRESET = {
  rise: { ...REVEAL, config: SPRING },
  fade: { ...FADE, config: SPRING_SOFT },
} as const;

export const Reveal = ({
  children,
  tag = "div",
  variant = "rise",
  delay = 0,
  ...props
}: RevealProps) => {
  const preset = PRESET[variant];
  return (
    <InviewSeen
      tag={tag}
      mode="once"
      from={preset.from}
      to={preset.to}
      config={preset.config}
      delayIn={delay}
      {...props}
    >
      {children}
    </InviewSeen>
  );
};
