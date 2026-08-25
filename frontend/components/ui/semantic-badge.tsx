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
  success: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  info: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  warning: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  danger: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  neutral: "bg-muted text-muted-foreground border-border",
  accent: "bg-primary/10 text-foreground border-primary/20",
  green: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  yellow: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  orange: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  teal: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  cyan: "bg-status-info-surface text-status-info-ink border-status-info-rule",
};

const SIZE_CLASSES = {
  xs: "px-1.5 py-0.5 text-micro",
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
