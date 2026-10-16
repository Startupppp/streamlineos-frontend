"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useBulkDecidePageReviews } from "@/hooks/api/kb/page-reviews";
import { useCan, useCanState } from "@/hooks/api/access";
import type { BulkDecideResultItem } from "@/hooks/api/kb/page-reviews";

export interface BulkDecideDialogProps {
  ids: number[];
  onCancel: () => void;
  onComplete: (failures: BulkDecideResultItem[]) => void;
}

export function BulkDecideDialog({
  ids,
  onCancel,
  onComplete,
}: BulkDecideDialogProps) {
  const [decision, setDecision] = useState<"approved" | "rejected">("approved");
  const [note, setNote] = useState("");
  const bulkDecide = useBulkDecidePageReviews();
  const canManageReviews = useCan("kb:reviews:manage");
  const decisionAccess = useCanState("kb:reviews:manage");
  const canDecide = canManageReviews && decisionAccess === "granted";

  function handleDecisionChange(val: string) {
    if (val === "approved" || val === "rejected") setDecision(val);
  }

  function handleNoteChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setNote(e.target.value);
  }

  function handleSubmit() {
    if (!canDecide || ids.length === 0 || bulkDecide.isPending || (decision === "rejected" && !note.trim())) return;

    const input =
      decision === "approved"
        ? {
            ids,
            decision: "approved" as const,
            note: note.trim() || undefined,
          }
        : {
            ids,
            decision: "rejected" as const,
            note: note.trim(),
          };

    bulkDecide.mutate(input, {
      onSuccess: (result) => {
        const failures = result.results.filter((r) => r.outcome !== "succeeded");
        const succeeded = result.results.length - failures.length;
        if (failures.length === 0) {
          toast.success(
            `${succeeded} review${succeeded !== 1 ? "s" : ""} ${decision}`,
          );
        }
        onComplete(failures);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Decide {ids.length} review{ids.length !== 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Approve or reject every selected review in one action.
          </DialogDescription>
        </DialogHeader>
        {!canDecide && (
          <p role="status" className="text-sm text-muted-foreground">
            {decisionAccess === "loading"
              ? "Checking review decision access…"
              : "You no longer have permission to decide reviews."}
          </p>
        )}
        <div className="space-y-3 px-0 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="kb-bulk-review-decision" className="text-xs">Decision</Label>
            <Select value={decision} onValueChange={handleDecisionChange} disabled={!canDecide || bulkDecide.isPending}>
              <SelectTrigger id="kb-bulk-review-decision" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Approve</SelectItem>
                <SelectItem value="rejected">Reject</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kb-bulk-review-note" className="text-xs">
              Note
              {decision === "rejected" ? (
                <span className="text-destructive"> *</span>
              ) : (
                " (optional)"
              )}
            </Label>
            <Textarea
              id="kb-bulk-review-note"
              value={note}
              onChange={handleNoteChange}
              disabled={!canDecide || bulkDecide.isPending}
              placeholder={
                decision === "rejected" ? "Explain the rejection…" : "Add a note…"
              }
              className="text-sm resize-none"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <LoadingButton
            type="button"
            size="sm"
            variant={decision === "rejected" ? "destructive" : "default"}
            isPending={bulkDecide.isPending}
            disabled={!canDecide || ids.length === 0 || (decision === "rejected" && !note.trim())}
            onClick={handleSubmit}
          >
            {decision === "approved" ? "Approve all" : "Reject all"}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
