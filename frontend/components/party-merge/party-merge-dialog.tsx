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
  signals?: readonly string[];
}

export interface PartyMergeDialogProps {
  pair: PartyMergePair;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSurvivorPartyId?: string;
  onMerged?: (partyMergeId: string) => void;
}

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
      keepOpenOnConfirm
      isPending={mergeParties.isPending}
      icon={<GitMerge className="h-5 w-5 text-destructive" />}
      title="Merge these two records?"
      description={`${loser.name} will be merged into ${survivor.name}. Their history, contacts and matched email and phone all move across. This can be undone from Merge history.`}
      confirmLabel="Merge records"
      onConfirm={handleConfirm}
      content={
        <div className="flex flex-col gap-3">
          <p className="text-dense text-muted-foreground">
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
