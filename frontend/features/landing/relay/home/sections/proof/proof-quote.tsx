"use client";

import { useRef, type ReactNode } from "react";

import { InviewSeen } from "@/features/landing/relay/components/ui/inview-seen";
import type { ProofStat } from "@/features/landing/relay/data/proof";

import { PROOF_TIMING } from "./timing";

const QUOTE_SPRING = { tension: 260, friction: 30 } as const;

const MASK =
  "linear-gradient(90deg, black calc(var(--reveal) - 40%), transparent var(--reveal))";

const Focus = ({
  trigger,
  tag,
  delay,
  className,
  children,
}: {
  trigger: React.RefObject<HTMLElement>;
  tag: "p" | "span";
  delay: number;
  className?: string;
  children: ReactNode;
}) => (
  <InviewSeen
    tag={tag}
    mode="once"
    trigger={trigger}
    from={{ opacity: 0, filter: "blur(8px)", "--reveal": "0%" }}
    to={{ opacity: 1, filter: "blur(0px)", "--reveal": "140%" }}
    config={QUOTE_SPRING}
    delayIn={delay}
    style={{ maskImage: MASK, WebkitMaskImage: MASK }}
    className={className}
  >
    {children}
  </InviewSeen>
);

export const ProofQuote = ({
  quote,
  delay,
}: {
  quote: ProofStat["quote"];
  delay: number;
}) => {
  const ref = useRef<HTMLElement>(null);
  const trigger = ref as React.RefObject<HTMLElement>;

  return (
    <figure
      ref={ref}
      className="absolute top-81.5 left-0 flex w-96 flex-col w1024:top-95.25 w1024:w-69.5 w768:top-98.75 w768:w-54.5 w390:static w390:mt-6 w390:w-full"
    >
      <blockquote className="text-body leading-body text-foreground">
        <Focus trigger={trigger} tag="p" delay={delay}>
          {quote.text}
        </Focus>
      </blockquote>
      <figcaption className="mt-10 flex flex-col gap-0.5 text-relay-label leading-label w1024:mt-6 w1024:gap-1 w768:absolute w768:top-28 w768:left-0 w768:mt-0 w768:w-full w390:static w390:mt-3">
        <Focus
          trigger={trigger}
          tag="span"
          delay={delay + PROOF_TIMING.quoteName}
          className="font-medium whitespace-nowrap text-foreground w768:whitespace-normal"
        >
          {quote.name}
        </Focus>
        <Focus
          trigger={trigger}
          tag="span"
          delay={delay + PROOF_TIMING.quoteRole}
          className="font-mono whitespace-nowrap text-foreground-dim w768:whitespace-normal"
        >
          {quote.role}
        </Focus>
      </figcaption>
    </figure>
  );
};
