"use client";

import { animated, useSpring } from "@react-spring/web";
import Link from "next/link";
import { useState, type MouseEvent, type ReactNode } from "react";

import { useHoverPress } from "@/features/landing/relay/components/ui/use-hover-press";
import { SPRING, SPRING_SOFT } from "@/features/landing/relay/lib/motion";

const AnimatedLink = animated(Link);

type Side = "left" | "right";

const sideOf = (event: MouseEvent<HTMLElement>): Side => {
  const box = event.currentTarget.getBoundingClientRect();
  return event.clientX < box.left + box.width / 2 ? "left" : "right";
};

const clip = (side: Side, v: number) => {
  const rest = `${(1 - Math.min(1, Math.max(0, v))) * 100}%`;
  return side === "left"
    ? `inset(0 ${rest} 0 0 round 999px)`
    : `inset(0 0 0 ${rest} round 999px)`;
};

export const GlassTierButton = ({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) => {
  const { hovered, pressed, handlers } = useHoverPress();
  const [side, setSide] = useState<Side>("left");
  const { f } = useSpring({ f: hovered ? 1 : 0, config: SPRING_SOFT });
  const { s } = useSpring({ s: pressed ? 0.97 : 1, config: SPRING });
  const clipPath = f.to((v) => clip(side, v));

  return (
    <AnimatedLink
      data-cursor="none"
      href={href}
      style={{ scale: s }}
      className={`flex h-12 items-center justify-center rounded-full border border-pricing-button-border bg-pricing-button text-body leading-body font-medium whitespace-nowrap text-pricing-button-text w1024:h-15 ${className}`}
      {...handlers}
      onMouseEnter={(event) => {
        setSide(sideOf(event));
        handlers.onMouseEnter();
      }}
      onMouseLeave={(event) => {
        setSide(sideOf(event));
        handlers.onMouseLeave();
      }}
    >
      <span className="relative">{children}</span>
      <animated.span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px flex items-center justify-center rounded-full bg-linear-135 from-brand-from to-brand-to text-on-accent"
        style={{ clipPath }}
      >
        {children}
      </animated.span>
    </AnimatedLink>
  );
};
