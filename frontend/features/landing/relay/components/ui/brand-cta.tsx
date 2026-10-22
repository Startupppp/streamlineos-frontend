"use client";

import { animated, easings, useSpring } from "@react-spring/web";
import Link from "next/link";
import type { CSSProperties } from "react";

const AnimatedLink = animated(Link);

import { SPRING } from "@/features/landing/relay/lib/motion";

import { useHoverPress } from "./use-hover-press";

export interface BrandCtaProps {
  label: string;
  href?: string;
  type?: "button" | "submit";
  className?: string;
}

const Chevrons = () => (
  <svg viewBox="0 0 28 28" aria-hidden="true" className="size-[1em]">
    <path
      d="M8 8l6 6-6 6"
      stroke="currentColor"
      strokeOpacity=".5"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 8l6 6-6 6"
      stroke="currentColor"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const BrandCta = ({
  label,
  href,
  type = "button",
  className = "",
}: BrandCtaProps) => {
  const { hovered, pressed, handlers } = useHoverPress();
  const { p } = useSpring({ p: hovered ? 1 : 0, config: SPRING });
  const { r } = useSpring({
    r: hovered ? 100 : 0,
    config: { duration: hovered ? 1100 : 450, easing: easings.easeInOutCubic },
  });
  const { s } = useSpring({
    s: pressed ? 0.97 : hovered ? 1.02 : 1,
    config: SPRING,
  });

  const inner = (
    <>
      
      <animated.span
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-linear-135 from-brand-from to-brand-to"
        style={{ opacity: p.to((v) => 1 - v * v) }}
      />
      <span className="relative">{label}</span>
      <animated.span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center rounded-full bg-brand-deep text-accent-soft"
        style={{
          clipPath: p.to((v) => `inset(0 ${(1 - v) * 100}% 0 0 round 999px)`),
        }}
      >
        
        <animated.span className="relative" style={{ x: p.to((v) => -5 * v) }}>
          {label}
          <animated.span
            className="absolute top-1/2 left-full ml-1.5 inline-flex -translate-y-1/2 text-[0.8em]"
            style={{ x: p.to((v) => -8 + 8 * v), opacity: p }}
          >
            <Chevrons />
          </animated.span>
        </animated.span>
      </animated.span>
      
      <animated.span
        aria-hidden="true"
        className="stroke-ring pointer-events-none absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,var(--accent)_var(--fill),transparent_var(--fill))]"
        style={{ "--fill": r.to((v) => `${v}%`) } as CSSProperties}
      />
    </>
  );
  const cls = `relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium whitespace-nowrap text-on-accent drop-shadow-cta ${className}`;
  const style = { scale: s };

  return href ? (
    <AnimatedLink
      data-cursor="none"
      href={href}
      className={cls}
      style={style}
      {...handlers}
    >
      {inner}
    </AnimatedLink>
  ) : (
    <animated.button
      data-cursor="none"
      type={type}
      className={cls}
      style={style}
      {...handlers}
    >
      {inner}
    </animated.button>
  );
};
