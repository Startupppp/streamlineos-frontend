"use client";

import type { RefObject } from "react";

import { InviewSeen } from "@/features/landing/relay/components/ui/inview-seen";

const cut = "round(down, calc(var(--typed) * 1ch), 1ch)";
const PER = 30;

export const ScaleType = ({
  children,
  trigger,
  delay = 0,
}: {
  children: string;
  trigger: RefObject<HTMLElement | null>;
  delay?: number;
}) => (
  <InviewSeen
    tag="span"
    mode="once"
    trigger={trigger as RefObject<HTMLElement>}
    className="relative inline-block"
    from={{ "--typed": 0 }}
    to={{ "--typed": children.length + 0.5 }}
    config={{ duration: children.length * PER }}
    delayIn={delay}
    style={{ clipPath: `inset(0 calc(100% - ${cut} - 0.1ch) 0 0)` }}
  >
    {children}
  </InviewSeen>
);
