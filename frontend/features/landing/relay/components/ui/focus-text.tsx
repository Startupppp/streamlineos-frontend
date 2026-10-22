"use client";

import type { ReactNode } from "react";

import { InviewSeen } from "@/features/landing/relay/components/ui/inview-seen";
import { SPRING_SOFT } from "@/features/landing/relay/lib/motion";
import type { Tags } from "@/features/landing/relay/types/springs";

const MASK = "linear-gradient(90deg, black calc(var(--reveal) - 40%), transparent var(--reveal))";

export const FocusText = ({
  tag = "p",
  className = "",
  delay = 0,
  children,
}: {
  tag?: Tags;
  className?: string;
  delay?: number;
  children: ReactNode;
}) => (
  <InviewSeen
    tag={tag}
    mode="once"
    from={{ opacity: 0, filter: "blur(8px)", "--reveal": "0%" }}
    to={{ opacity: 1, filter: "blur(0px)", "--reveal": "140%" }}
    config={SPRING_SOFT}
    delayIn={delay}
    style={{ maskImage: MASK, WebkitMaskImage: MASK }}
    className={className}
  >
    {children}
  </InviewSeen>
);
