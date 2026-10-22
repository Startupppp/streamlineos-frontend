"use client";

import { animated, useSpring } from "@react-spring/web";
import { Fragment, useEffect, useRef, useState } from "react";

import { SPRING_SOFT, STEP } from "@/features/landing/relay/lib/motion";

const SOFT_FAST = {
  tension: SPRING_SOFT.tension * 1.5,
  friction: SPRING_SOFT.friction * 1.22,
} as const;

const BLANK = 10;
const ROWS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", " "];
const ZWSP = "​";

const Digit = ({
  value,
  delay,
  widths,
}: {
  value: number;
  delay: number;
  widths: readonly number[] | null;
}) => {
  const target = widths ? (value === BLANK ? 0 : widths[value]) : 0;
  const primed = useRef(false);
  useEffect(() => {
    if (widths) primed.current = true;
  }, [widths]);
  const { d, w } = useSpring({
    d: value,
    w: target,
    delay: (key: string) => (key === "w" && !primed.current ? 0 : delay),
    config: SOFT_FAST,
    immediate: (key) => key === "w" && !primed.current,
  });

  return (
    <animated.span
      className="relative inline-block"
      style={{ width: widths ? w.to((v) => `${v}px`) : undefined }}
    >
      
      <span className="text-transparent">
        {value === BLANK ? ZWSP : ROWS[value]}
      </span>
      <span className="absolute inset-0 overflow-clip">
        <animated.span
          className="absolute inset-x-0 flex flex-col"
          style={{ top: d.to((v) => `${-v * 100}%`) }}
        >
          {ROWS.map((row, n) => (
            <span key={n} className="block">
              {row}
            </span>
          ))}
        </animated.span>
      </span>
    </animated.span>
  );
};

export const PriceRoll = ({
  price,
  prices,
  className = "",
}: {
  price: string;
  prices: readonly string[];
  className?: string;
}) => {
  const columns = Math.max(...prices.map((p) => p.replace(/\D/g, "").length));
  const prefix = price.match(/^\D*/)?.[0] ?? "";
  const digits = price.replace(/\D/g, "").padStart(columns, "x");
  const comma = (n: number) =>
    n > 0 && (columns - n) % 3 === 0 && /\d/.test(digits.slice(0, n));

  const probe = useRef<HTMLSpanElement>(null);
  const [widths, setWidths] = useState<number[] | null>(null);
  useEffect(() => {
    let live = true;
    void document.fonts.ready.then(() => {
      const el = probe.current;
      if (!live || !el) return;
      setWidths(
        [...el.children].map((child) => child.getBoundingClientRect().width),
      );
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <span className={`relative whitespace-nowrap ${className}`}>
      <span className="sr-only">{price}</span>
      <span aria-hidden="true">
        {prefix}
        {[...digits].map((ch, n) => (
          <Fragment key={n}>
            {comma(n) && ","}
            <Digit
              value={ch === "x" ? BLANK : Number(ch)}
              delay={n * 0.8 * STEP}
              widths={widths}
            />
          </Fragment>
        ))}
      </span>
      <span
        ref={probe}
        aria-hidden="true"
        className="invisible absolute top-0 left-0"
      >
        {ROWS.slice(0, BLANK).map((row) => (
          <span key={row} className="inline-block">
            {row}
          </span>
        ))}
      </span>
    </span>
  );
};
