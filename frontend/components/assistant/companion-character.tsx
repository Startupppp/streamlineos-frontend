"use client";

import { useMemo, useSyncExternalStore, type CSSProperties } from "react";
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
    shell: "var(--primary)",
    shellDark: "color-mix(in oklab, var(--primary) 72%, black)",
    glow: "var(--category-cyan-fill, #67e8f9)",
    face: "color-mix(in oklab, var(--primary) 24%, #07162f)",
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
      <path d="M34 35.5h4" stroke="var(--cp-glow)" strokeWidth="1.8" strokeLinecap="round" />
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
      <ellipse cx="36" cy="75" rx="18" ry="3" fill="currentColor" opacity=".14" />
      <motion.g animate={figureAnimation} transition={figureTransition} style={{ transformOrigin: "36px 72px" }}>
        <path d="M18 52c-6 2-8 8-5 14 1.2 2.5 3.4 3.4 5.4 1.7l4.8-7.1" fill="var(--cp-shell-dark)" />
        <path d="M54 52c6 2 8 8 5 14-1.2 2.5-3.4 3.4-5.4 1.7l-4.8-7.1" fill="var(--cp-shell-dark)" />
        <rect x="23" y="45" width="26" height="24" rx="11" fill="var(--cp-shell)" />
        <path d="M28 65v7c0 2 1.5 3 3.5 3h1c2 0 3-1 3-3v-5M44 65v7c0 2-1.5 3-3.5 3h-1c-2 0-3-1-3-3v-5" fill="var(--cp-shell-dark)" />
        <rect x="29" y="50" width="14" height="10" rx="5" fill="var(--cp-face)" opacity=".34" />
        <path d="M33 53.2l3 2.2-3 2.2M39 53.2l-3 2.2 3 2.2" fill="none" stroke="var(--cp-glow)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13 17l-6 7 6 7zM59 17l6 7-6 7z" fill="var(--cp-shell-dark)" />
        <rect x="7" y="19" width="10" height="17" rx="5" fill="var(--cp-shell)" />
        <rect x="55" y="19" width="10" height="17" rx="5" fill="var(--cp-shell)" />
        <rect x="11" y="7" width="50" height="41" rx="18" fill="var(--cp-shell)" />
        <path d="M19 10c8-5 26-5 34 0" fill="none" stroke="white" strokeOpacity=".24" strokeWidth="2" strokeLinecap="round" />
        <rect x="16" y="15" width="40" height="27" rx="10" fill="var(--cp-face)" />
        <path d="M20 18c7-3 25-3 32 0" fill="none" stroke="white" strokeOpacity=".08" strokeWidth="2" strokeLinecap="round" />
        <CompanionFace state={state} />
        <path d="M36 7V3" stroke="var(--cp-shell-dark)" strokeWidth="2" strokeLinecap="round" />
        <motion.path
          d="M36 0.5l2.2 2.2L36 5l-2.2-2.3z"
          fill="var(--cp-glow)"
          animate={motionEnabled && state === "thinking" ? { opacity: [0.35, 1, 0.35], scale: [0.85, 1.15, 0.85] } : undefined}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "36px 3px" }}
        />
      </motion.g>
    </svg>
  );
}
