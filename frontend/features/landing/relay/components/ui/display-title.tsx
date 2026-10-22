"use client";

import { createElement } from "react";

import { InviewSeen } from "@/features/landing/relay/components/ui/inview-seen";
import { SPRING_SOFT } from "@/features/landing/relay/lib/motion";
import type { Tags } from "@/features/landing/relay/types/springs";

export interface TitleParts {
  before: string;
  accent: string;
  after: string;
}

export interface DisplayTitleProps extends TitleParts {
  tag?: Tags;
  className?: string;
  accentClassName?: string;
  delay?: number;
  still?: boolean;
}

const TITLE_CLASS =
  "bg-linear-to-b/srgb from-title-gradient-from to-title-gradient-to bg-clip-text font-semibold tracking-title text-transparent";

export const DisplayTitle = ({
  tag = "h2",
  before,
  accent,
  after,
  className = "",
  accentClassName = "",
  delay = 0,
  still = false,
}: DisplayTitleProps) => {
  const accentRun = (
    <span
      className={`font-relay-serif leading-none font-normal text-title-accent italic ${accentClassName}`}
    >
      {accent}
    </span>
  );
  if (still) {
    return createElement(tag, { className: `${TITLE_CLASS} ${className}` }, before, accentRun, after);
  }
  return (
  <InviewSeen
    tag={tag}
    mode="once"
    from={{ opacity: 0, filter: "blur(10px)", "--reveal": "0%" }}
    to={{ opacity: 1, filter: "blur(0px)", "--reveal": "140%" }}
    config={SPRING_SOFT}
    delayIn={delay}
    style={{
      maskImage:
        "linear-gradient(90deg, black calc(var(--reveal) - 40%), transparent var(--reveal))",
      WebkitMaskImage:
        "linear-gradient(90deg, black calc(var(--reveal) - 40%), transparent var(--reveal))",
    }}
    className={`${TITLE_CLASS} ${className}`}
  >
    {before}
    {accentRun}
    {after}
  </InviewSeen>
  );
};
