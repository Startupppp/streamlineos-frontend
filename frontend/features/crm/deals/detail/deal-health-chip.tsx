"use client";

import { useDealHealth } from "@/hooks/api/crm";
import { cn } from "@/lib/utils";
import type { DealHealthLevel } from "@/types/crm";

interface DealHealthChipProps {
  dealId: number;
  score?: number | null;
}

const LEVEL_STYLES: Record<DealHealthLevel, string> = {
  healthy: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  at_risk: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  critical: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  unknown: "bg-muted text-muted-foreground border-border",
};

function scoreTolevel(score: number): DealHealthLevel {
  if (score >= 70) return "healthy";
  if (score >= 40) return "at_risk";
  return "critical";
}

const LEVEL_LABELS: Record<DealHealthLevel, string> = {
  healthy: "Healthy",
  at_risk: "At Risk",
  critical: "Critical",
  unknown: "Unknown",
};

export function DealHealthChip({ dealId, score }: DealHealthChipProps) {
  const { data: health } = useDealHealth(dealId);
  const level: DealHealthLevel =
    health?.level ??
    (score !== null && score !== undefined ? scoreTolevel(score) : "unknown");
  const displayScore = health?.score ?? score ?? null;

  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg border bg-card text-sm">
      <span className="text-muted-foreground font-medium">Deal Health</span>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border",
          LEVEL_STYLES[level],
        )}
      >
        {displayScore !== null && <span>{displayScore}</span>}
        {LEVEL_LABELS[level]}
      </span>
    </div>
  );
}
