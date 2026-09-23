"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

  function handleDecisionChange(val: string) {
    if (val === "approved" || val === "rejected") setDecision(val);
  }

  function handleNoteChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setNote(e.target.value);
  }

  function handleSubmit() {
    if (decision === "rejected" && !note.trim()) return;

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
        </DialogHeader>
        <div className="space-y-3 px-0 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Decision</Label>
            <Select value={decision} onValueChange={handleDecisionChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Approve</SelectItem>
                <SelectItem value="rejected">Reject</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Note
              {decision === "rejected" ? (
                <span className="text-destructive"> *</span>
              ) : (
                " (optional)"
              )}
            </Label>
            <Textarea
              value={note}
              onChange={handleNoteChange}
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
            disabled={decision === "rejected" && !note.trim()}
            onClick={handleSubmit}
          >
            {decision === "approved" ? "Approve all" : "Reject all"}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
