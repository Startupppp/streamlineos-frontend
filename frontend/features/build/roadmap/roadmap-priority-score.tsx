"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RoadmapPrioritization, RoadmapTierWeighting } from "@/hooks/api/build/roadmap";
import {
  CRM_ACCOUNT_TIER_LABEL,
  RICE_UNAVAILABLE_LABEL,
  ROADMAP_TIER_UNWEIGHTED_LABEL,
} from "./roadmap-constants";

interface RoadmapPriorityScoreProps {
  prioritization: RoadmapPrioritization | undefined;
  tierWeighting?: RoadmapTierWeighting;
  className?: string;
}

/**
 * The weighted figure is shown only when the backend says every tier input was
 * present. When it is not, the plain RICE score stands and the reason travels
 * with it, so a weighted number is never implied by its absence.
 */
export function RoadmapPriorityScore({
  prioritization,
  tierWeighting,
  className,
}: RoadmapPriorityScoreProps) {
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
