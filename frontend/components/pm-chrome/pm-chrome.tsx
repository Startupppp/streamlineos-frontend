"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { fadeUp, fadeUpReduced, pmSnappy, pmStagger } from "@/lib/motion-presets";

export const PM_PANEL =
  "rounded-xl border border-border/80 bg-card/85 shadow-sm";

export const PM_PANEL_SOLID =
  "rounded-xl border border-border/80 bg-card shadow-sm";


export const PM_FILL_SECTION = "flex min-h-0 flex-1 flex-col overflow-hidden";

export const PM_TOOLBAR =
  "flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between";

export const PM_ROW =
  "group flex min-w-0 items-center gap-2.5 border-b border-border/70 px-3 py-2 last:border-b-0 transition-colors duration-150 hover:bg-primary/[0.035]";

interface PmPageShellProps {
  children: ReactNode;
  className?: string;
}

export function PmPageShell({ children, className }: PmPageShellProps) {
  return (
    <div className={cn("relative flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden", className)}>
      {children}
    </div>
  );
}

interface PmSectionProps {
  children: ReactNode;
  className?: string;
  index?: number;
}

export function PmSection({ children, className, index = 0 }: PmSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      className={cn("relative", className)}
      initial="hidden"
      animate="show"
      variants={shouldReduceMotion ? fadeUpReduced : fadeUp}
      transition={pmStagger(index)}
    >
      {children}
    </motion.div>
  );
}

interface PmPanelProps {
  children: ReactNode;
  className?: string;
  solid?: boolean;
}

export function PmPanel({ children, className, solid = false }: PmPanelProps) {
  return (
    <div className={cn(solid ? PM_PANEL_SOLID : PM_PANEL, "overflow-hidden", className)}>
      {children}
    </div>
  );
}

interface PmStaggerListProps {
  children: ReactNode;
  className?: string;
  role?: string;
  "aria-label"?: string;
}

export function PmStaggerList({
  children,
  className,
  role,
  "aria-label": ariaLabel,
}: PmStaggerListProps) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      role={role}
      aria-label={ariaLabel}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: shouldReduceMotion
            ? { duration: 0 }
            : { staggerChildren: 0.03, delayChildren: 0.04 },
        },
      }}
      transition={pmSnappy}
    >
      {children}
    </motion.div>
  );
}
