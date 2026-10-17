"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { getErrorMessage } from "@/lib/get-error-message";
import { useLinkDuplicateCandidate, type DuplicateCandidateGroup } from "@/hooks/api/hr/recruitment";
import { TruncatedText } from "@/components/ui/truncated-text";
import { formatDistanceToNow } from "date-fns";

interface DuplicateResolutionDialogProps {
  group: DuplicateCandidateGroup;
  onClose: () => void;
}

interface CandidateOptionButtonProps {
  candidate: DuplicateCandidateGroup["candidates"][number];
  isKept: boolean;
  onSelect: (id: number) => void;
}

function CandidateOptionButton({ candidate: c, isKept, onSelect }: CandidateOptionButtonProps) {
  function handleClick() { onSelect(c.id); }
  return (
    <button
      key={c.id}
      type="button"
      onClick={handleClick}
      className={`text-left rounded-xl border p-4 transition-colors ${
        isKept ? "border-brand-core bg-primary/5" : "border-border hover:bg-muted/40"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
        <TruncatedText
          text={`${c.firstName} ${c.lastName}`}
          className="text-sm font-semibold text-foreground min-w-0 flex-1"
        />
        {isKept && <Badge className="text-micro shrink-0">Keep this one</Badge>}
        {c.duplicateOfId && (
          <Badge variant="outline" className="text-micro shrink-0">
            Already linked
          </Badge>
        )}
      </div>
      <TruncatedText
        text={c.email ?? ""}
        className="text-xs text-muted-foreground break-all"
      />
      {c.phone && (
        <TruncatedText
          text={c.phone}
          className="text-xs text-muted-foreground"
        />
      )}
      <p className="text-xs text-muted-foreground mt-1">Status: {c.status}</p>
      <p className="text-dense text-muted-foreground mt-1">
        Added {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
      </p>
    </button>
  );
}

export function DuplicateResolutionDialog({ group, onClose }: DuplicateResolutionDialogProps) {
  const linkDuplicate = useLinkDuplicateCandidate();
  const [keptId, setKeptId] = useState<number>(group.candidates[0]?.id ?? 0);

  function handleDialogOpenChange(v: boolean) { if (!v) onClose(); }

  const handleMerge = useCallback(() => {
    const others = group.candidates.filter((c) => c.id !== keptId && !c.duplicateOfId);
    if (others.length === 0) {
      toast.info("Nothing to merge — the other record is already linked.");
      onClose();
      return;
    }
    Promise.all(
      others.map((c) => linkDuplicate.mutateAsync({ candidateId: c.id, duplicateOfId: keptId })),
    )
      .then(() => {
        toast.success("Marked as duplicate");
        onClose();
      })
      .catch((e) => toast.error(getErrorMessage(e)));
  }, [group, keptId, linkDuplicate, onClose]);

  return (
    <Dialog open onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">Possible duplicate candidates</DialogTitle>
          <DialogDescription className="text-xs">
            These candidates share the same email address ({group.key}). Choose which record to keep.
            Applications, messages, documents, referrals, reference checks and interviews move onto that
            record. The others stay linked as duplicates.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {group.candidates.map((c) => (
            <CandidateOptionButton
              key={c.id}
              candidate={c}
              isKept={c.id === keptId}
              onSelect={setKeptId}
            />
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Keep separate
          </Button>
          <LoadingButton size="sm" onClick={handleMerge} isPending={linkDuplicate.isPending} loadingText="Merging…">
            Merge into this record
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
