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

/**
 * The union deliberately offers colour names alongside semantic ones, and the
 * two halves read different scales.
 *
 * A semantic tone means the thing it names, so it stays on `status-*`. A
 * colour-named tone means "some other kind, distinguishable from its
 * neighbours" — that is a category, so it reads `category-*`. Collapsing the
 * colour names onto the nearest status is what made eleven tones render as
 * six, and what made a case at medium priority look identical to one at high.
 *
 * `yellow` is the one pair left congruent, and on purpose: it resolves to the
 * same amber as `warning` because the only hue left in the categorical scale
 * between amber and green is `lime`, and a lime badge reads as "fine" in the
 * low → medium → high → critical ramps that are `yellow`'s only callers.
 * `warning` and `yellow` are two names for one intent; `orange` is the step
 * above, and that is the distinction those ramps actually lost.
 */
const TONE_CLASSES: Record<BadgeTone, string> = {
  success: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  info: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  warning: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  danger: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  neutral: "bg-muted text-muted-foreground border-border",
  accent: "bg-primary/10 text-foreground border-primary/20",
  green: "bg-category-green-surface text-category-green-ink border-category-green-rule",
  yellow: "bg-category-amber-surface text-category-amber-ink border-category-amber-rule",
  orange: "bg-category-orange-surface text-category-orange-ink border-category-orange-rule",
  teal: "bg-category-teal-surface text-category-teal-ink border-category-teal-rule",
  cyan: "bg-category-cyan-surface text-category-cyan-ink border-category-cyan-rule",
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
