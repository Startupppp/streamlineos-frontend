"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useParty } from "@/hooks/api/party/parties";
import type { DataQualityFinding } from "@/hooks/api/crm/data-quality-findings-schema";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export interface FindingDecision {
  finding: DataQualityFinding;
  action: "apply" | "dismiss";
}

const SEVERITY_TONE: Record<DataQualityFinding["severity"], StatusTone> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};

export function FindingSeverityBadge({ severity }: { severity: DataQualityFinding["severity"] }) {
  const tone = statusToneClasses(SEVERITY_TONE[severity]);
  return (
    <Badge variant="outline" className={cn("h-5 px-2 py-0.5 text-micro capitalize", tone.surface, tone.ink, tone.rule)}>
      {severity}
    </Badge>
  );
}

/** `duplicate-email` → `Duplicate email`. The kind is a backend slug, never shown raw. */
export function humanizeFindingKind(kind: string): string {
  const words = kind.replace(/[-_.]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Finding";
}

/** The party a finding is about, by name rather than id. */
export const FindingPartyName = memo(function FindingPartyName({ partyId }: { partyId: string }) {
  const { data, isLoading } = useParty(partyId);
  if (isLoading) return <Skeleton className="h-4 w-32" />;
  const name = data?.displayName ?? data?.name;
  return <span className="text-sm">{name ?? "Unnamed record"}</span>;
});

interface FindingRowActionsProps {
  finding: DataQualityFinding;
  canResolve: boolean;
  onDecide: (decision: FindingDecision) => void;
}

/**
 * Resolve and dismiss for one open finding.
 *
 * "Mark resolved" is offered only where the finding proposes no automatic
 * remedy: applying a `merge-parties` finding merges two parties, and merging
 * from this queue is held for a product decision.
 */
export const FindingRowActions = memo(function FindingRowActions({
  finding,
  canResolve,
  onDecide,
}: FindingRowActionsProps) {
  function handleResolve() {
    onDecide({ finding, action: "apply" });
  }
  function handleDismiss() {
    onDecide({ finding, action: "dismiss" });
  }

  if (!canResolve || finding.status !== "open") return null;

  return (
    <div className="flex justify-end gap-2">
      {finding.proposedAction === "none" ? (
        <Button type="button" variant="outline" size="sm" onClick={handleResolve}>
          Mark resolved
        </Button>
      ) : null}
      <Button type="button" variant="ghost" size="sm" onClick={handleDismiss}>
        Dismiss
      </Button>
    </div>
  );
});
