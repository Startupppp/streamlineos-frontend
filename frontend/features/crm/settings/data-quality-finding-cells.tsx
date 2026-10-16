"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useParty } from "@/hooks/api/party/parties";
import type { DataQualityFinding } from "@/hooks/api/crm/data-quality-findings-schema";

export interface FindingDecision {
  finding: DataQualityFinding;
  action: "apply" | "dismiss";
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
