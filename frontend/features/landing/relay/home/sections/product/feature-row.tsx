import type { ReactNode } from "react";

import { FocusText } from "@/features/landing/relay/components/ui/focus-text";
import { Reveal } from "@/features/landing/relay/components/ui/reveal";
import { REVEAL, STEP } from "@/features/landing/relay/lib/motion";

import { RollIndex } from "./roll-index";

export interface FeatureCopy {
  index: string;
  title: string;
  body: string;
}

export interface FeatureRowProps extends FeatureCopy {
  visual: ReactNode;
  flip?: boolean;
  className?: string;
  titleClassName?: string;
  copyClassName?: string;
}

export const CARD =
  "relative w-190 shrink-0 overflow-clip rounded-product-card border border-product-card-border bg-product-card w1024:w-132 w390:w-87.5";

export const FeatureRow = ({
  index,
  title,
  body,
  visual,
  flip = false,
  className = "",
  titleClassName = "",
  copyClassName = "",
}: FeatureRowProps) => {
  const copy = (
    <Reveal
      key="copy"
      className="flex w-110 shrink-0 flex-col items-start gap-4 w1024:w-90 w768:w-130 w768:items-center w768:text-center w390:w-full"
    >
      <RollIndex
        value={index}
        className="font-mono text-relay-label leading-label tracking-product-index text-product-index w390:-mb-2"
      />
      <FocusText
        tag="h3"
        delay={STEP}
        className={`text-product-row-title leading-product-row-title font-medium tracking-product-row-title text-foreground ${titleClassName}`}
      >
        {title}
      </FocusText>
      <FocusText
        delay={2 * STEP}
        className={`text-body leading-body text-foreground-muted ${copyClassName}`}
      >
        {body}
      </FocusText>
    </Reveal>
  );
  const card = (
    <Reveal key="card" delay={REVEAL.step} className="shrink-0">
      {visual}
    </Reveal>
  );

  return (
    <article
      className={`flex items-center justify-between py-12 w1024:py-8 w768:h-auto w768:flex-col w768:justify-start w768:gap-8 w390:gap-6 w390:py-0 ${flip ? "flex-row-reverse" : ""} ${className}`}
    >
      {copy}
      {card}
    </article>
  );
};
