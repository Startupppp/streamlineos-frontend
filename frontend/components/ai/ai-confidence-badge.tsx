"use client";

import { cn } from "@/lib/utils";

type ConfidenceLevel = "low" | "medium" | "high";

interface AiConfidenceBadgeProps {
  confidence: number;
  className?: string;
}

const LEVEL_CONFIG: Record<
  ConfidenceLevel,
  { label: string; className: string }
> = {
  low: {
    label: "Low",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  },
  medium: {
    label: "Medium",
    className:
      "bg-muted text-muted-foreground border-border",
  },
  high: {
    label: "High",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  },
};

function resolveLevel(confidence: number): ConfidenceLevel {
  if (confidence < 0.5) return "low";
  if (confidence < 0.8) return "medium";
  return "high";
}

export function AiConfidenceBadge({ confidence, className }: AiConfidenceBadgeProps) {
  const level = resolveLevel(confidence);
  const { label, className: levelClass } = LEVEL_CONFIG[level];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
        levelClass,
        className,
      )}
    >
      {label} confidence
    </span>
  );
}
