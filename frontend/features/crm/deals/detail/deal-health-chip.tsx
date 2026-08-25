"use client";

import { useDealHealth } from "@/hooks/api/crm";
import { cn } from "@/lib/utils";
import type { DealHealthLevel } from "@/types/crm";

interface DealHealthChipProps {
  dealId: number;
  score?: number | null;
}

const LEVEL_STYLES: Record<DealHealthLevel, string> = {
  healthy: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  at_risk: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  critical: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
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
