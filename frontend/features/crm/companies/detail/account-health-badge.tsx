"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrgRollup } from "@/types/crm";

interface AccountHealthBadgeProps {
  healthScore: number | null;
  rollup?: OrgRollup | null;
  showComputed?: boolean;
  className?: string;
}

export function computeHealthScore(rollup: OrgRollup): number {
  let score = 0;
  score += Math.min(rollup.totalContacts * 10, 30);
  score += Math.min(rollup.openDeals * 10, 40);
  if (rollup.totalLeads > 0) score += 20;
  if (rollup.totalDealValue > 100_000) score += 10;
  return Math.min(score, 100);
}

export function getHealthLabel(score: number): {
  label: string;
  badgeClass: string;
  dotClass: string;
} {
  if (score >= 70)
    return {
      label: "Healthy",
      badgeClass: "bg-status-success-surface text-status-success-ink border-status-success-rule",
      dotClass: "bg-emerald-500",
    };
  if (score >= 40)
    return {
      label: "At Risk",
      badgeClass: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
      dotClass: "bg-amber-500",
    };
  return {
    label: "Critical",
    badgeClass: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
    dotClass: "bg-red-500",
  };
}

export function AccountHealthBadge({
  healthScore,
  rollup,
  showComputed = false,
  className,
}: AccountHealthBadgeProps) {
  const score =
    healthScore !== null && healthScore !== undefined
      ? healthScore
      : rollup && showComputed
        ? computeHealthScore(rollup)
        : null;

  if (score === null) {
    return (
      <Badge
        variant="outline"
        className={cn("text-micro bg-muted text-muted-foreground border-border", className)}
      >
        N/A
      </Badge>
    );
  }

  const { label, badgeClass, dotClass } = getHealthLabel(score);

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-micro flex items-center gap-1.5 px-2 py-0.5",
        badgeClass,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotClass)} />
      {label} · {score}%
    </Badge>
  );
}
