"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BulkDecideResultItem } from "@/hooks/api/kb/page-reviews";

const OUTCOME_LABELS: Record<
  Exclude<BulkDecideResultItem["outcome"], "succeeded">,
  string
> = {
  denied: "Permission denied",
  conflict: "Already decided",
  notFound: "Review not found",
};

export interface BulkFailureWithTitle extends BulkDecideResultItem {
  pageTitle: string;
}

export interface BulkDecideResultsDialogProps {
  succeeded: number;
  failures: BulkFailureWithTitle[];
  onRetry: (ids: number[]) => void;
  onDismiss: () => void;
}

export function BulkDecideResultsDialog({
  succeeded,
  failures,
  onRetry,
  onDismiss,
}: BulkDecideResultsDialogProps) {
  function handleRetry() {
    onRetry(failures.map((f) => f.id));
  }

  return (
    <Dialog open onOpenChange={onDismiss}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {succeeded} succeeded · {failures.length} failed
          </DialogTitle>
          <DialogDescription>
            The reviews listed below were not decided. Each shows why it was
            skipped.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-2 max-h-64 overflow-y-auto">
          {failures.map((failure) => (
            <div
              key={failure.id}
              className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2"
            >
              <span className="text-sm font-medium text-foreground line-clamp-1 flex-1">
                {failure.pageTitle}
              </span>
              {failure.outcome !== "succeeded" && (
                <Badge
                  variant="outline"
                  className="shrink-0 text-dense text-status-danger-ink border-status-danger-rule"
                >
                  {OUTCOME_LABELS[failure.outcome]}
                </Badge>
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onDismiss}>
            Dismiss
          </Button>
          {failures.some(
            (f) => f.outcome === "denied" || f.outcome === "conflict",
          ) ? null : (
            <Button type="button" size="sm" onClick={handleRetry}>
              Retry {failures.length} failed
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
