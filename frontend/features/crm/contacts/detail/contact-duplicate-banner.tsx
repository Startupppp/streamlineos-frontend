"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/api/access";
import { usePartyDuplicates } from "@/hooks/api/party/merges";
import { PartyMergeDialog } from "@/components/party-merge/party-merge-dialog";
import type { PartyDuplicateCandidate } from "@/types/party/merges";

/**
 * "This record may be a duplicate", on the record itself.
 *
 * Reads the persisted queue rather than a list recomputed per request, which is
 * the difference that makes the banner honest: a pair dismissed as "not
 * duplicates" stays dismissed, so this stops appearing instead of coming back on
 * every visit for the rest of the record's life.
 *
 * Filtered client-side against the page of pending candidates. The queue is
 * capped at 100 per tenant and this is a hint rather than a report — the full
 * list, and the merge history, live at `/parties/duplicates`, which the banner
 * links to rather than duplicating.
 */
export function ContactDuplicateBanner({ partyId }: { partyId: string | null }) {
  const canMerge = useCan("party:merges:manage");
  const [mergeTarget, setMergeTarget] = useState<PartyDuplicateCandidate | null>(null);

  const duplicates = usePartyDuplicates({ limit: 100 });

  const relevant = useMemo(
    () =>
      partyId
        ? (duplicates.data?.data ?? []).filter(
            (candidate) =>
              candidate.left.partyId === partyId || candidate.right.partyId === partyId,
          )
        : [],
    [duplicates.data, partyId],
  );

  const handleReview = useCallback(() => setMergeTarget(relevant[0] ?? null), [relevant]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) setMergeTarget(null);
  }, []);

  if (relevant.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-2 rounded-lg border border-status-warning-rule bg-status-warning-surface px-3 py-2 text-xs text-status-warning-ink">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-status-warning-ink" />
        <span>
          {relevant.length} possible duplicate{relevant.length > 1 ? "s" : ""} of this
          record.
        </span>
        {canMerge ? (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-status-warning-ink underline"
            onClick={handleReview}
          >
            Review
          </Button>
        ) : null}
        <Button
          asChild
          variant="link"
          size="sm"
          className="ml-auto h-auto p-0 text-xs text-status-warning-ink underline"
        >
          <Link href="/parties/duplicates">See all</Link>
        </Button>
      </div>

      {mergeTarget ? (
        <PartyMergeDialog
          open
          onOpenChange={handleOpenChange}
          pair={{
            left: mergeTarget.left,
            right: mergeTarget.right,
            signals: mergeTarget.signals,
          }}
          /*
           * The record the reader is standing on is preselected as the survivor.
           * They opened this from its detail page, so it is the one they mean to
           * keep — and every field conflict resolves in the survivor's favour,
           * so defaulting to the other side would overwrite what is on screen.
           */
          defaultSurvivorPartyId={partyId ?? undefined}
        />
      ) : null}
    </>
  );
}
