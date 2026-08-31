"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Undo2, CheckCircle2 } from "lucide-react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { ConfirmWithReasonSheet } from "@/components/ui/confirm-with-reason-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import { formatShortDate } from "@/lib/date-utils";
import {
  useJournalBatches,
  useCreateJournalBatch,
  usePostJournalBatch,
  useReverseJournalBatch,
  useReconcileJournalBatch,
} from "@/hooks/api/payroll/journal-batches";
import type { JournalBatch, JournalBatchStatus } from "@/types/payroll/journal-batches";

interface JournalBatchesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
}

const STATUS_TONE: Record<JournalBatchStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  POSTED:
    "bg-status-success-surface text-status-success-ink border-status-success-rule",
  EXPORTED:
    "bg-status-info-surface text-status-info-ink border-status-info-rule",
  REVERSED:
    "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  FAILED:
    "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
};


export function JournalBatchesSheet({ open, onOpenChange, month }: JournalBatchesSheetProps) {
  const canManage = useCan("payroll:accounting:manage");

  const { data, isLoading, isError, refetch } = useJournalBatches({ periodKey: month });
  const createMutation = useCreateJournalBatch();
  const postMutation = usePostJournalBatch();
  const reverseMutation = useReverseJournalBatch();
  const reconcileMutation = useReconcileJournalBatch();

  const [reversing, setReversing] = useState<JournalBatch | null>(null);
  const [reconciling, setReconciling] = useState<JournalBatch | null>(null);

  const batches = data?.data ?? [];

  function handleSnapshot() {
    createMutation.mutate(
      { periodKey: month },
      {
        onSuccess: () => toast.success(`Journal snapshot created for ${month}`),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handlePost(batch: JournalBatch) {
    postMutation.mutate(batch.id, {
      onSuccess: () => toast.success(`Batch v${batch.version} posted to the ledger`),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleConfirmReverse(reason: string) {
    if (!reversing) return;
    reverseMutation.mutate(
      { batchId: reversing.id, reason },
      {
        onSuccess: () => {
          toast.success("Reversal batch created");
          setReversing(null);
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
          setReversing(null);
        },
      },
    );
  }

  function handleConfirmReconcile() {
    if (!reconciling) return;
    reconcileMutation.mutate(
      { batchId: reconciling.id, status: "RECONCILED" },
      {
        onSuccess: () => {
          toast.success("Batch marked reconciled");
          setReconciling(null);
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
          setReconciling(null);
        },
      },
    );
  }

  function handleRetry() {
    void refetch();
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <SheetHeader className="shrink-0 border-b border-border px-5 pb-4 pt-5 text-left">
            <SheetTitle className="text-base font-semibold">Journal Batches</SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              Immutable accounting snapshots for {month}. A posted batch is never edited —
              corrections create a linked reversal.
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="flex-1 overflow-y-auto px-5 py-4">
            {canManage && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Snapshots can only be taken from an approved or locked run.
                </p>
                <LoadingButton
                  size="sm"
                  isPending={createMutation.isPending}
                  loadingText="Snapshotting…"
                  onClick={handleSnapshot}
                >
                  New snapshot
                </LoadingButton>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-muted" />
                ))}
              </div>
            ) : isError ? (
              <EmptyState
                compact
                title="Failed to load journal batches"
                description="Something went wrong while fetching the accounting outbox."
                action={{ label: "Retry", onClick: handleRetry }}
              />
            ) : batches.length === 0 ? (
              <EmptyState
                compact
                illustrationPreset="documents"
                title="No journal batches yet"
                description={`Nothing has been posted to the ledger for ${month}. Take a snapshot once the run is approved or locked.`}
              />
            ) : (
              <div className="space-y-3">
                {batches.map((batch) => (
                  <div
                    key={batch.id}
                    className="rounded-xl border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            Version {batch.version}
                          </span>
                          <Badge variant="outline" className={`text-micro ${STATUS_TONE[batch.status]}`}>
                            {batch.status}
                          </Badge>
                          {batch.provisional && (
                            <Badge variant="outline" className="border-status-warning-rule bg-status-warning-surface text-micro text-status-warning-ink">
                              Provisional
                            </Badge>
                          )}
                          {batch.reversalOfBatchId !== null && (
                            <Badge variant="outline" className="text-micro">
                              Reverses v{batch.reversalOfBatchId}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-dense text-muted-foreground">
                          {batch.lineCount} lines · created {formatShortDate(batch.createdAt)}
                          {batch.postedAt ? ` · posted ${formatShortDate(batch.postedAt)}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-xs tabular-nums text-foreground">
                          Dr {formatMoney(batch.totalDebits)}
                        </p>
                        <p className="font-mono text-xs tabular-nums text-muted-foreground">
                          Cr {formatMoney(batch.totalCredits)}
                        </p>
                      </div>
                    </div>

                    {batch.reversalReason && (
                      <p className="mt-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-dense text-muted-foreground">
                        Reason: {batch.reversalReason}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
                      <Badge
                        variant="outline"
                        className={
                          batch.reconciliationStatus === "RECONCILED"
                            ? "border-status-success-rule bg-status-success-surface text-micro text-status-success-ink"
                            : "text-micro"
                        }
                      >
                        {batch.reconciliationStatus}
                      </Badge>

                      {canManage && batch.status === "DRAFT" && (
                        <LoadingButton
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2.5 text-xs"
                          isPending={postMutation.isPending}
                          onClick={() => handlePost(batch)}
                        >
                          Post to ledger
                        </LoadingButton>
                      )}

                      {canManage &&
                        (batch.status === "POSTED" || batch.status === "EXPORTED") &&
                        batch.reversalOfBatchId === null && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1.5 px-2.5 text-xs text-destructive hover:text-destructive"
                            onClick={() => setReversing(batch)}
                          >
                            <Undo2 className="h-3 w-3" />
                            Reverse
                          </Button>
                        )}

                      {canManage &&
                        batch.status !== "DRAFT" &&
                        batch.reconciliationStatus !== "RECONCILED" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1.5 px-2.5 text-xs"
                            onClick={() => setReconciling(batch)}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Mark reconciled
                          </Button>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      <ConfirmWithReasonSheet
        open={reversing !== null}
        onOpenChange={(v) => !v && setReversing(null)}
        title={`Reverse batch v${reversing?.version ?? ""}?`}
        description="This writes a new contra batch with debits and credits swapped. The original batch is kept and marked reversed — nothing is deleted."
        reasonLabel="Reversal reason"
        reasonPlaceholder="e.g. Wrong cost centre mapping on the salary expense line"
        reasonRequired
        reasonErrorMessage="A reversal reason is required for the audit trail."
        confirmLabel="Reverse batch"
        isPending={reverseMutation.isPending}
        onConfirm={handleConfirmReverse}
      />

      <ConfirmSheet
        open={reconciling !== null}
        onOpenChange={(v) => !v && setReconciling(null)}
        title={`Mark batch v${reconciling?.version ?? ""} reconciled?`}
        description="Confirm this batch has been matched against the accounting system. You can move it back to unreconciled later."
        confirmLabel="Mark reconciled"
        isPending={reconcileMutation.isPending}
        onConfirm={handleConfirmReconcile}
      />
    </>
  );
}
