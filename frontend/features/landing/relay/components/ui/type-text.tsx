"use client";

import { InviewSeen } from "@/features/landing/relay/components/ui/inview-seen";
import type { Tags } from "@/features/landing/relay/types/springs";

export interface TypeTextProps {
  children: string;
  tag?: Tags;
  className?: string;
  delay?: number;
  per?: number;
}

const cut = "round(down, calc(var(--typed) * 1ch), 1ch)";

export const TypeText = ({
  children,
  tag = "span",
  className = "",
  delay = 0,
  per = 30,
}: TypeTextProps) => (
  <InviewSeen
    tag={tag}
    mode="once"
    className={`relative inline-block ${className}`}
    from={{ "--typed": 0 }}
    to={{ "--typed": children.length + 0.5 }}
    config={{ duration: children.length * per }}
    delayIn={delay}
    style={{ clipPath: `inset(0 calc(100% - ${cut} - 0.1ch) 0 0)` }}
  >
    {children}
  </InviewSeen>
);
