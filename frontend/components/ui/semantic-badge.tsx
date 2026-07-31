"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone =
  | "success"
  | "info"
  | "warning"
  | "danger"
  | "neutral"
  | "accent"
  | "green"
  | "yellow"
  | "orange"
  | "teal"
  | "cyan";

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  info: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  danger: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  neutral: "bg-muted text-muted-foreground border-border",
  accent: "bg-primary/10 text-foreground border-primary/20",
  green: "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30",
  yellow: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-300 dark:border-yellow-500/30",
  orange: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30",
  teal: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/30",
  cyan: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/30",
};

const SIZE_CLASSES = {
  xs: "px-1.5 py-0.5 text-[10px]",
  sm: "px-2 py-0.5 text-xs",
} as const;

export interface SemanticBadgeProps {
  tone: BadgeTone;
  label: ReactNode;
  icon?: ReactNode;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export function SemanticBadge({ tone, label, icon, size = "sm", className }: SemanticBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border font-medium",
        SIZE_CLASSES[size],
        TONE_CLASSES[tone],
        className,
      )}
    >
      {icon}
      {label}
    </span>
  );
}
