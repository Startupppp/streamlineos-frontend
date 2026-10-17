"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatMoneyCompact } from "@/lib/format-utils";
import { useOrgDisplay } from "@/hooks/api/org-display";
import type { RoadmapPrioritization, RoadmapTierWeighting } from "@/hooks/api/build/roadmap-schema";
import {
  CRM_ACCOUNT_TIER_LABEL,
  RICE_UNAVAILABLE_LABEL,
  ROADMAP_TIER_UNWEIGHTED_LABEL,
} from "./roadmap-constants";

interface RoadmapPriorityScoreProps {
  prioritization: RoadmapPrioritization | undefined;
  tierWeighting?: RoadmapTierWeighting;
  decisionSnapshot?: Record<string, unknown> | null;
  className?: string;
}

function acceptedOverrideScore(snapshot: Record<string, unknown> | null | undefined): number | null {
  if (snapshot?.scoreIsOverride !== true) return null;
  return typeof snapshot.score === "number" && Number.isFinite(snapshot.score) ? snapshot.score : null;
}


function LinkedRevenueBadge({ tierWeighting }: { tierWeighting: RoadmapTierWeighting }) {
  const display = useOrgDisplay();
  const { linkedRevenue, revenueKnownAccountCount, linkedAccountCount } = tierWeighting;
  if (linkedAccountCount <= 0) return null;

  if (linkedRevenue === null)
    return (
      <Badge
        variant="outline"
        className="text-micro text-muted-foreground"
        title={`No linked account carries a recorded value, so revenue is unknown for ${String(linkedAccountCount)} linked account(s).`}
      >
        Revenue unknown
      </Badge>
    );

  const partial = revenueKnownAccountCount < linkedAccountCount;
  return (
    <Badge
      variant="secondary"
      className="text-micro tabular-nums"
      title={
        partial
          ? `Total across ${String(revenueKnownAccountCount)} of ${String(linkedAccountCount)} linked accounts; the rest carry no recorded value.`
          : `Total across all ${String(linkedAccountCount)} linked accounts.`
      }
    >
      {formatMoneyCompact(linkedRevenue, display)}
      {partial ? ` (${String(revenueKnownAccountCount)}/${String(linkedAccountCount)})` : ""}
    </Badge>
  );
}

export function RoadmapPriorityScore({
  prioritization,
  tierWeighting,
  decisionSnapshot,
  className,
}: RoadmapPriorityScoreProps) {
  const overrideScore = acceptedOverrideScore(decisionSnapshot);
  if (overrideScore !== null) {
    const computed = prioritization?.score ?? null;
    return (
      <span className={cn("inline-flex items-center gap-1", className)}>
        <Badge variant="default" className="text-micro tabular-nums">
          RICE {overrideScore}
        </Badge>
        <Badge
          variant="outline"
          className="text-micro text-muted-foreground"
          title={`Score override carried from the accepted opportunity.${
            computed === null ? "" : ` Computed RICE from this item's inputs: ${String(computed)}.`
          }`}
        >
          Opportunity override
        </Badge>
      </span>
    );
  }

  if (!prioritization) return null;

  if (prioritization.isComplete && prioritization.score !== null) {
    const weighted =
      tierWeighting?.tierWeighted === true && tierWeighting.weightedScore !== null
        ? tierWeighting
        : null;

    if (weighted)
      return (
        <span className={cn("inline-flex items-center gap-1", className)}>
          <Badge variant="default" className="text-micro tabular-nums">
            RICE {weighted.weightedScore}
          </Badge>
          <Badge
            variant="secondary"
            className="text-micro"
            title={`Weighted by the highest linked account tier: ${
              weighted.tier === null ? "" : CRM_ACCOUNT_TIER_LABEL[weighted.tier]
            } (×${String(weighted.weight)}). Unweighted RICE ${String(prioritization.score)}.`}
          >
            ×{weighted.weight}{" "}
            {weighted.tier === null ? null : CRM_ACCOUNT_TIER_LABEL[weighted.tier]}
          </Badge>
          <LinkedRevenueBadge tierWeighting={weighted} />
        </span>
      );

    const unweightedReason = tierWeighting?.unweightedReason ?? null;
    return (
      <span className={cn("inline-flex items-center gap-1", className)}>
        <Badge variant="default" className="text-micro tabular-nums">
          RICE {prioritization.score}
        </Badge>
        {unweightedReason === null ? null : (
          <Badge
            variant="outline"
            className="text-micro text-muted-foreground"
            title={ROADMAP_TIER_UNWEIGHTED_LABEL[unweightedReason]}
          >
            Not tier-weighted
          </Badge>
        )}
        {tierWeighting === undefined ? null : (
          <LinkedRevenueBadge tierWeighting={tierWeighting} />
        )}
      </span>
    );
  }

  const reason = prioritization.unavailableReason;
  const label = reason ? RICE_UNAVAILABLE_LABEL[reason] : RICE_UNAVAILABLE_LABEL.missing_inputs;
  const missing = prioritization.missingInputs;

  return (
    <Badge
      variant="outline"
      className={cn("text-micro text-muted-foreground", className)}
      title={missing.length > 0 ? `Missing: ${missing.join(", ")}` : label}
    >
      {label}
    </Badge>
  );
}
