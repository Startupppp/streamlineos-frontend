"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useParty } from "@/hooks/api/party/parties";
import type { DataQualityFinding } from "@/hooks/api/crm/data-quality-findings-schema";

export interface FindingDecision {
  finding: DataQualityFinding;
  action: "apply" | "dismiss" | "merge" | "reverse";
}

/** The confirm copy for each decision a finding row offers. */
export const DECISION_COPY: Record<FindingDecision["action"], { title: string; description: string; confirm: string; done: string }> = {
  apply: {
    title: "Mark this finding resolved?",
    description: "Use this when the record has been fixed. Nothing on the record is changed by this action.",
    confirm: "Mark resolved",
    done: "Finding marked resolved",
  },
  dismiss: {
    title: "Dismiss this finding?",
    description: "Dismissing says the finding was wrong. It leaves the open queue and counts against the detector's accuracy.",
    confirm: "Dismiss",
    done: "Finding dismissed",
  },
  merge: {
    title: "Merge these two records?",
    description: "One record absorbs the other. Check what survives before you confirm.",
    confirm: "Merge records",
    done: "Records merged",
  },
  reverse: {
    title: "Undo this decision?",
    description:
      "Every finding closed by the same decision reopens, and any merge it applied is reverted from its snapshot.",
    confirm: "Undo decision",
    done: "Decision undone",
  },
};

/**
 * Whether a closed finding's decision can be offered for undo.
 *
 * A merge is undone from the snapshot its `party_merges` row holds, and the
 * finding names that row in `undoToken.partyMergeId`. A merge finding without
 * one has nothing to revert from, so it is not offered.
 */
function canOfferUndo(finding: DataQualityFinding): boolean {
  if (finding.status === "open" || !finding.resolutionId) return false;
  if (finding.status === "dismissed" || finding.proposedAction !== "merge-parties") return true;
  return typeof finding.undoToken?.["partyMergeId"] === "string";
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
 * The decisions one finding offers.
 *
 * Open: "Mark resolved" where the finding proposes no automatic remedy, "Review
 * merge" where it proposes merging two parties (the merge runs only after its
 * preview is confirmed), and Dismiss. Closed: "Undo" where the decision can be
 * taken back.
 */
export const FindingRowActions = memo(function FindingRowActions({
  finding,
  canResolve,
  onDecide,
}: FindingRowActionsProps) {
  function handleResolve() {
    onDecide({ finding, action: "apply" });
  }
  function handleMerge() {
    onDecide({ finding, action: "merge" });
  }
  function handleDismiss() {
    onDecide({ finding, action: "dismiss" });
  }
  function handleUndo() {
    onDecide({ finding, action: "reverse" });
  }

  if (!canResolve) return null;

  if (finding.status !== "open")
    return canOfferUndo(finding) ? (
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={handleUndo}>
          Undo
        </Button>
      </div>
    ) : null;

  return (
    <div className="flex justify-end gap-2">
      {finding.proposedAction === "none" ? (
        <Button type="button" variant="outline" size="sm" onClick={handleResolve}>
          Mark resolved
        </Button>
      ) : null}
      {finding.proposedAction === "merge-parties" && finding.relatedPartyId ? (
        <Button type="button" variant="outline" size="sm" onClick={handleMerge}>
          Review merge
        </Button>
      ) : null}
      <Button type="button" variant="ghost" size="sm" onClick={handleDismiss}>
        Dismiss
      </Button>
    </div>
  );
});
