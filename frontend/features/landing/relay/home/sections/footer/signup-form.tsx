"use client";

import { animated, useSpring } from "@react-spring/web";
import { type FormEvent, useLayoutEffect, useRef, useState } from "react";

import { SPRING } from "@/features/landing/relay/lib/motion";

interface SignupFormProps {
  emailLabel: string;
  submit: string;
  href: string;
  className?: string;
}

const SENT = "Opening";
const ARROW = 22;

const Arrow = () => (
  <svg viewBox="0 0 14 14" aria-hidden="true" className="size-3.5">
    <path
      d="M2 7h10M8 3l4 4-4 4"
      stroke="currentColor"
      strokeWidth="1.6"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Check = () => (
  <svg viewBox="0 0 14 14" aria-hidden="true" className="size-3.5">
    <path
      d="M2.5 7.5l3 3 6-7"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SignupForm = ({
  emailLabel,
  submit,
  href,
  className = "",
}: SignupFormProps) => {
  const [focused, setFocused] = useState(false);
  const [sent, setSent] = useState(false);
  const startRef = useRef<HTMLSpanElement>(null);
  const sentRef = useRef<HTMLSpanElement>(null);
  const [widths, setWidths] = useState({ start: 0, sent: 0 });

  useLayoutEffect(() => {
    if (!startRef.current || !sentRef.current) return;
    setWidths({
      start: startRef.current.getBoundingClientRect().width,
      sent: sentRef.current.getBoundingClientRect().width,
    });
  }, []);

  const { ring, arrow, done, width } = useSpring({
    ring: focused ? 1 : 0,
    arrow: focused && !sent ? 1 : 0,
    done: sent ? 1 : 0,
    width: sent ? widths.sent : widths.start,
    config: SPRING,
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(true);
    window.setTimeout(() => window.location.assign(href), 600);
  };

  return (
    <form
      onSubmit={onSubmit}
      className={`relative flex h-13 w-162.5 items-center gap-2 overflow-clip rounded-full bg-footer-signup-fill py-1.5 pr-1.5 pl-5 w1024:h-14 w1024:w-102.25 w768:w-160 w390:w-77.5 w1024:py-2 w1024:pr-5 w768:pr-2 ${className}`}
    >
      <animated.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full inset-ring-1 inset-ring-footer-signup-ring"
        style={{ opacity: ring }}
      />
      <label htmlFor="footer-email" className="sr-only">
        {emailLabel}
      </label>
      <input
        id="footer-email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder={emailLabel}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="h-6 min-w-px flex-1 bg-transparent text-body leading-body text-on-accent outline-none placeholder:text-footer-ink-placeholder"
      />
      <button
        type="submit"
        className="flex h-10 shrink-0 items-center justify-center rounded-full bg-on-accent px-6 text-relay-label leading-label font-medium whitespace-nowrap text-accent"
      >
        <animated.span
          aria-live="polite"
          className={`relative flex items-center ${sent ? "overflow-clip" : ""}`}
          style={sent ? { width } : undefined}
        >
          <animated.span
            ref={startRef}
            className="block"
            style={{
              opacity: done.to((v) => 1 - v),
              y: done.to((v) => -8 * v),
            }}
          >
            {sent ? <span className="sr-only">{SENT}</span> : null}
            <span aria-hidden={sent}>{submit}</span>
          </animated.span>
          <animated.span
            ref={sentRef}
            aria-hidden="true"
            className="absolute top-0 left-0 flex items-center gap-1.5"
            style={{
              opacity: done,
              y: done.to((v) => 8 * (1 - v)),
            }}
          >
            <Check />
            {SENT}
          </animated.span>
        </animated.span>
        <animated.span
          aria-hidden="true"
          className="flex justify-end overflow-clip"
          style={{
            width: arrow.to((v) => v * ARROW),
            opacity: arrow,
          }}
        >
          <animated.span
            className="inline-flex"
            style={{ x: arrow.to((v) => -6 * (1 - v)) }}
          >
            <Arrow />
          </animated.span>
        </animated.span>
      </button>
    </form>
  );
};
