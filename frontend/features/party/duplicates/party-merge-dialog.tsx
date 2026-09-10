"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { GitMerge } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { useMergeParties } from "@/hooks/api/party/merges";
import type { DuplicateCandidateSide } from "@/types/party/merges";
import { DuplicatePartyCard } from "./duplicate-pair-card";

export interface PartyMergePair {
  left: DuplicateCandidateSide;
  right: DuplicateCandidateSide;
  /** What the detector matched on, where a detector was involved. */
  signals?: readonly string[];
}

export interface PartyMergeDialogProps {
  pair: PartyMergePair;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which side to preselect, for a screen opened from one of the two records. */
  defaultSurvivorPartyId?: string;
  onMerged?: (partyMergeId: string) => void;
}

/**
 * Fusing two customer records into one.
 *
 * A `ConfirmDialog destructive` rather than a plain dialog with a red button
 * (§13): a merge is a lifecycle action on two businesses, and the two records
 * are the `content` so the decision is made against what is on screen rather
 * than remembered from the previous step.
 *
 * The survivor is a deliberate choice, not a default. Every field conflict
 * resolves in the survivor's favour, so this is the only question that matters
 * here — and until `preferSurvivorPartyId` reached the route the server
 * silently kept whichever record was older, which could be neither the one the
 * reviewer picked nor the one they were looking at.
 */
export function PartyMergeDialog({
  pair,
  open,
  onOpenChange,
  defaultSurvivorPartyId,
  onMerged,
}: PartyMergeDialogProps) {
  const [survivorPartyId, setSurvivorPartyId] = useState(
    defaultSurvivorPartyId ?? pair.left.partyId,
  );
  const mergeParties = useMergeParties();

  const survivor = survivorPartyId === pair.right.partyId ? pair.right : pair.left;
  const loser = survivorPartyId === pair.right.partyId ? pair.left : pair.right;

  const handleConfirm = useCallback(() => {
    mergeParties.mutate(
      {
        leftPartyId: pair.left.partyId,
        rightPartyId: pair.right.partyId,
        preferSurvivorPartyId: survivorPartyId,
      },
      {
        onSuccess: (result) => {
          /*
           * The toast says it can be undone, and where. It is not the only place
           * that offer lives — the merge history below the queue holds every
           * reversible merge — but a user who acts on the wrong pair reaches for
           * the notification first, and telling them the offer outlives it is
           * what stops the panic.
           */
          toast.success(`Merged ${loser.name} into ${survivor.name}`, {
            description: "You can undo this from Merge history.",
          });
          onOpenChange(false);
          onMerged?.(result.partyMergeId);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [
    mergeParties,
    pair.left.partyId,
    pair.right.partyId,
    survivorPartyId,
    loser.name,
    survivor.name,
    onOpenChange,
    onMerged,
  ]);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      destructive
      // The dialog stays put when the server refuses, so the reviewer can read
      // the reason against the two records rather than an empty screen.
      keepOpenOnConfirm
      isPending={mergeParties.isPending}
      icon={<GitMerge className="h-5 w-5 text-destructive" />}
      title="Merge these two records?"
      description={`${loser.name} will be merged into ${survivor.name}. Their history, contacts and matched email and phone all move across. This can be undone from Merge history.`}
      confirmLabel="Merge records"
      onConfirm={handleConfirm}
      content={
        <div className="flex flex-col gap-3">
          <p className="text-[11px] text-muted-foreground">
            Choose the record to keep. Where the two disagree, the kept record&apos;s
            details win.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DuplicatePartyCard
              side={pair.left}
              isSurvivor={survivorPartyId === pair.left.partyId}
              onSelect={setSurvivorPartyId}
            />
            <DuplicatePartyCard
              side={pair.right}
              isSurvivor={survivorPartyId === pair.right.partyId}
              onSelect={setSurvivorPartyId}
            />
          </div>
        </div>
      }
    />
  );
}
