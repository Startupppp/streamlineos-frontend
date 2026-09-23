"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RoadmapPrioritization } from "@/hooks/api/build/roadmap";
import { RICE_UNAVAILABLE_LABEL } from "./roadmap-constants";

interface RoadmapPriorityScoreProps {
  prioritization: RoadmapPrioritization | undefined;
  className?: string;
}

export function RoadmapPriorityScore({ prioritization, className }: RoadmapPriorityScoreProps) {
  if (!prioritization) return null;

  if (prioritization.isComplete && prioritization.score !== null)
    return (
      <Badge variant="default" className={cn("text-micro tabular-nums", className)}>
        RICE {prioritization.score}
      </Badge>
    );

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
