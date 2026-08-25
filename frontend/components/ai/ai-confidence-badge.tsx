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
      "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  },
  medium: {
    label: "Medium",
    className:
      "bg-muted text-muted-foreground border-border",
  },
  high: {
    label: "High",
    className:
      "bg-status-success-surface text-status-success-ink border-status-success-rule",
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
        "inline-flex items-center rounded-full border px-1.5 py-0.5 text-micro font-medium",
        levelClass,
        className,
      )}
    >
      {label} confidence
    </span>
  );
}
