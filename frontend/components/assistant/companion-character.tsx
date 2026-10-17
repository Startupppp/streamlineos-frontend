"use client";

import { useId, useMemo, useSyncExternalStore, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type CompanionActivity =
  | "idle"
  | "thinking"
  | "listening"
  | "clarification"
  | "proposal"
  | "success"
  | "error"
  | "quiet";

const PRESET_COLORS: Record<string, { shell: string; shellDark: string; glow: string; face: string }> = {
  default: {
    shell: "#527cff",
    shellDark: "#2449c9",
    glow: "#67ecff",
    face: "#0a1838",
  },
  dusk: {
    shell: "var(--category-violet-fill)",
    shellDark: "color-mix(in oklab, var(--category-violet-fill) 68%, black)",
    glow: "#a5f3fc",
    face: "#17122f",
  },
  meadow: {
    shell: "var(--category-emerald-fill)",
    shellDark: "color-mix(in oklab, var(--category-emerald-fill) 68%, black)",
    glow: "#bbf7d0",
    face: "#06251d",
  },
  ember: {
    shell: "var(--category-orange-fill)",
    shellDark: "color-mix(in oklab, var(--category-orange-fill) 68%, black)",
    glow: "#fef08a",
    face: "#30130a",
  },
  mono: {
    shell: "var(--foreground)",
    shellDark: "color-mix(in oklab, var(--foreground) 68%, var(--background))",
    glow: "var(--background)",
    face: "color-mix(in oklab, var(--background) 86%, black)",
  },
};

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

function pageHidden() {
  return document.visibilityState === "hidden";
}

function serverPageHidden() {
  return false;
}

function CompanionFace({ state }: { state: CompanionActivity }) {
  if (state === "success") {
    return (
      <g fill="none" stroke="var(--cp-glow)" strokeWidth="2.6" strokeLinecap="round">
        <path d="M24 29q3-4 6 0" />
        <path d="M42 29q3-4 6 0" />
        <path d="M33 35q3 2.8 6 0" strokeWidth="1.8" />
      </g>
    );
  }
  if (state === "quiet") {
    return (
      <g fill="none" stroke="var(--cp-glow)" strokeWidth="2.4" strokeLinecap="round">
        <path d="M24 29h6" />
        <path d="M42 29h6" />
        <path d="M34 35h4" strokeWidth="1.6" />
      </g>
    );
  }
  if (state === "error") {
    return (
      <g fill="none" stroke="var(--cp-glow)" strokeWidth="2.4" strokeLinecap="round">
        <path d="M24 27l6 3" />
        <path d="M48 27l-6 3" />
        <path d="M33 36q3-2.5 6 0" strokeWidth="1.6" />
      </g>
    );
  }
  if (state === "thinking") {
    return (
      <g fill="var(--cp-glow)">
        <rect x="23" y="26" width="7" height="5" rx="2.5" />
        <circle cx="45" cy="28.5" r="2.5" />
        <circle cx="37" cy="36" r="1.1" opacity=".75" />
      </g>
    );
  }
  if (state === "listening") {
    return (
      <g fill="none" stroke="var(--cp-glow)" strokeLinecap="round">
        <circle cx="27" cy="28" r="2.8" fill="var(--cp-glow)" stroke="none" />
        <circle cx="45" cy="28" r="2.8" fill="var(--cp-glow)" stroke="none" />
        <path d="M32 35q1-2 2 0t2 0t2 0t2 0" strokeWidth="1.8" />
      </g>
    );
  }
  if (state === "clarification") {
    return (
      <g fill="none" stroke="var(--cp-glow)" strokeWidth="2.3" strokeLinecap="round">
        <circle cx="27" cy="28.5" r="2.5" />
        <circle cx="45" cy="28.5" r="2.5" />
        <path d="M35 34q3-2 5 0" strokeWidth="1.6" />
      </g>
    );
  }
  if (state === "proposal") {
    return (
      <g data-expression="proposal" fill="none" stroke="var(--cp-glow)" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 29l3-3 3 3-3 3zM42 29l3-3 3 3-3 3z" strokeWidth="2" />
        <path d="M33 35h6" strokeWidth="1.8" />
      </g>
    );
  }
  return (
    <g fill="var(--cp-glow)">
      <rect x="23" y="26" width="7" height="5" rx="2.5" />
      <rect x="42" y="26" width="7" height="5" rx="2.5" />
      <path d="M32 35q4 3.5 8 0" fill="none" stroke="var(--cp-glow)" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="20" cy="34" r="1.2" opacity=".55" />
      <circle cx="52" cy="34" r="1.2" opacity=".55" />
    </g>
  );
}

interface CompanionCharacterProps {
  preset: string;
  state: CompanionActivity;
  animation: "subtle" | "off";
  className?: string;
}

export function CompanionCharacter({ preset, state, animation, className }: CompanionCharacterProps) {
  const gradientId = useId().replace(/:/g, "");
  const hidden = useSyncExternalStore(subscribeVisibility, pageHidden, serverPageHidden);
  const reduce = useReducedMotion();
  const colors = PRESET_COLORS[preset] ?? PRESET_COLORS.default;
  const motionEnabled = animation === "subtle" && !hidden && !reduce;
  const figureAnimation = useMemo(() => {
    if (!motionEnabled || state === "quiet") return undefined;
    if (state === "success") return { y: [0, -7, 0], rotate: [0, -2, 2, 0] };
    if (state === "error") return { x: [0, -2, 2, -2, 0] };
    if (state === "clarification") return { rotate: [0, -3, 0, 3, 0] };
    if (state === "proposal") return { scale: [1, 1.045, 1] };
    if (state === "listening") return { scale: [1, 1.025, 1] };
    return { y: [0, -2, 0] };
  }, [motionEnabled, state]);
  const figureTransition = state === "success" || state === "error"
    ? { duration: 0.42, repeat: 0 }
    : { duration: state === "thinking" ? 1.25 : 2.8, repeat: Infinity, ease: "easeInOut" as const };
  const style = {
    "--cp-shell": colors.shell,
    "--cp-shell-dark": colors.shellDark,
    "--cp-glow": colors.glow,
    "--cp-face": colors.face,
  } as CSSProperties;

  return (
    <svg
      viewBox="0 0 72 80"
      aria-hidden="true"
      focusable="false"
      data-testid="companion-character"
      data-preset={preset}
      data-state={state}
      data-animation={animation}
      data-paused={hidden ? "true" : "false"}
      className={cn("shrink-0 overflow-visible drop-shadow-sm", className)}
      style={style}
    >
      <defs>
        <linearGradient id={`${gradientId}-shell`} x1="12%" y1="5%" x2="88%" y2="100%">
          <stop stopColor="var(--cp-glow)" stopOpacity=".85" />
          <stop offset=".27" stopColor="var(--cp-shell)" />
          <stop offset="1" stopColor="var(--cp-shell-dark)" />
        </linearGradient>
        <linearGradient id={`${gradientId}-visor`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop stopColor="#182d5d" />
          <stop offset="1" stopColor="var(--cp-face)" />
        </linearGradient>
      </defs>
      <ellipse cx="36" cy="75" rx="20" ry="3" fill="var(--cp-shell-dark)" opacity=".25" />
      <motion.g animate={figureAnimation} transition={figureTransition} style={{ transformOrigin: "36px 72px" }}>
        <path d="M19 50 9 56l-3 9 7 5 9-6 4-10zM53 50l10 6 3 9-7 5-9-6-4-10z" fill="var(--cp-shell-dark)" stroke="var(--cp-face)" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="m9 58-2 7 6 2 5-5M63 58l2 7-6 2-5-5" fill="var(--cp-shell)" opacity=".8" />
        <path d="M25 45h22l8 13-5 13H22l-5-13z" fill={`url(#${gradientId}-shell)`} stroke="var(--cp-face)" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M25 68v5q0 3 3 3h7l1-7M47 68v5q0 3-3 3h-7l-1-7" fill="var(--cp-shell-dark)" stroke="var(--cp-face)" strokeWidth="2" />
        <path d="M23 53h26l2 10-6 6H27l-6-6z" fill="var(--cp-face)" opacity=".75" />
        <path d="m27 57 5 4-5 4m18-8-5 4 5 4" fill="none" stroke="var(--cp-glow)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M33 61h6" stroke="var(--cp-shell)" strokeWidth="2" strokeLinecap="round" />
        <path d="M14 15 20 3l10 7 6-6 6 6 10-7 6 12 7 10-4 19-12 9H23L11 44 7 25z" fill={`url(#${gradientId}-shell)`} stroke="var(--cp-face)" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="m20 4 3 10-9 5m38-15-3 10 9 5M36 5v8" fill="none" stroke="var(--cp-glow)" strokeOpacity=".75" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M13 26q0-10 12-12h22q12 2 12 12l-3 15q-3 7-20 8-17-1-20-8z" fill={`url(#${gradientId}-visor)`} stroke="var(--cp-shell-dark)" strokeWidth="2" />
        <path d="M19 22q5-5 16-5h10" fill="none" stroke="white" strokeOpacity=".22" strokeWidth="2" strokeLinecap="round" />
        <CompanionFace state={state} />
        <motion.path
          d="m36 1 2.2 2.2L36 5.4l-2.2-2.2z"
          fill="var(--cp-glow)"
          animate={motionEnabled && state === "thinking" ? { opacity: [0.35, 1, 0.35], scale: [0.85, 1.15, 0.85] } : undefined}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "36px 3px" }}
        />
      </motion.g>
    </svg>
  );
}
