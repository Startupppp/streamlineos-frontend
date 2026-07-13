"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getErrorMessage } from "@/lib/get-error-message";
import { useLinkDuplicateCandidate, type DuplicateCandidateGroup } from "@/hooks/api/hr/recruitment";
import { formatDistanceToNow } from "date-fns";

interface DuplicateResolutionDialogProps {
  group: DuplicateCandidateGroup;
  onClose: () => void;
}

export function DuplicateResolutionDialog({ group, onClose }: DuplicateResolutionDialogProps) {
  const linkDuplicate = useLinkDuplicateCandidate();
  const [keptId, setKeptId] = useState<number>(group.candidates[0]!.id);

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
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">Possible duplicate candidates</DialogTitle>
          <DialogDescription className="text-xs">
            These candidates share the same email address ({group.key}). Choose which record to keep — the
            others will be linked to it as duplicates and hidden from the main list.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {group.candidates.map((c) => {
            const isKept = c.id === keptId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setKeptId(c.id)}
                className={`text-left rounded-xl border p-4 transition-colors ${
                  isKept ? "border-brand-core bg-brand-core/5" : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-semibold text-foreground">
                    {c.firstName} {c.lastName}
                  </span>
                  {isKept && <Badge className="text-[10px]">Keep this one</Badge>}
                  {c.duplicateOfId && (
                    <Badge variant="outline" className="text-[10px]">
                      Already linked
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{c.email}</p>
                {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                <p className="text-xs text-muted-foreground mt-1">Status: {c.status}</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  Added {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                </p>
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Keep separate
          </Button>
          <Button size="sm" onClick={handleMerge} disabled={linkDuplicate.isPending}>
            {linkDuplicate.isPending ? "Linking…" : "Link as duplicate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
