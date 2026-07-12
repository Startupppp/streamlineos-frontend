"use client";

import { use, useCallback, useState } from "react";
import Link from "next/link";
import { Send, Undo2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingState, ErrorState } from "@/components/shared";
import { FinanceStatusBadge } from "@/features/accounting/shared";
import {
  useJournalEntry,
  usePostJournalEntry,
  useReverseJournalEntry,
} from "@/hooks/api/accounting";
import {
  useSubmitJournalApproval,
  useApproveJournal,
  useRejectJournal,
} from "@/hooks/api/accounting/core";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
import type { JournalLine } from "@/types/accounting";

interface JournalEntryDetailPageProps {
  params: Promise<{ entryId: string }>;
}

function formatDate(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function formatDateTime(value: Date): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseAmount(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatAmount(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function sumColumn(lines: JournalLine[], key: "debit" | "credit"): number {
  return lines.reduce((total, line) => total + parseAmount(line[key]), 0);
}

interface ApproveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryId: number;
}

function ApproveDialog({ open, onOpenChange, entryId }: ApproveDialogProps) {
  const [note, setNote] = useState("");
  const approveMutation = useApproveJournal(entryId);

  function handleNoteChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setNote(e.target.value);
  }

  function handleApprove(): void {
    approveMutation.mutate(
      { note: note || undefined },
      {
        onSuccess: () => {
          toast.success("Entry approved");
          onOpenChange(false);
          setNote("");
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }

  function handleClose(isOpen: boolean): void {
    if (!isOpen) setNote("");
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Approve journal entry?</DialogTitle>
          <DialogDescription>
            This entry will be approved and posted to the ledger.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <label
            htmlFor="approve-note"
            className="text-xs font-medium text-muted-foreground block mb-1.5"
          >
            Note (optional)
          </label>
          <Input
            id="approve-note"
            value={note}
            onChange={handleNoteChange}
            placeholder="Approval note…"
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={approveMutation.isPending}
          >
            Cancel
          </Button>
          <LoadingButton
            isPending={approveMutation.isPending}
            loadingText="Approving…"
            onClick={handleApprove}
          >
            Approve
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryId: number;
}

function RejectDialog({ open, onOpenChange, entryId }: RejectDialogProps) {
  const [note, setNote] = useState("");
  const rejectMutation = useRejectJournal(entryId);

  function handleNoteChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setNote(e.target.value);
  }

  function handleReject(): void {
    rejectMutation.mutate(
      { note: note || undefined },
      {
        onSuccess: () => {
          toast.success("Entry rejected");
          onOpenChange(false);
          setNote("");
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }

  function handleClose(isOpen: boolean): void {
    if (!isOpen) setNote("");
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Reject journal entry?</DialogTitle>
          <DialogDescription>This entry will be returned to draft status.</DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <label
            htmlFor="reject-note"
            className="text-xs font-medium text-muted-foreground block mb-1.5"
          >
            Note (optional)
          </label>
          <Input
            id="reject-note"
            value={note}
            onChange={handleNoteChange}
            placeholder="Reason for rejection…"
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={rejectMutation.isPending}
          >
            Cancel
          </Button>
          <LoadingButton
            isPending={rejectMutation.isPending}
            loadingText="Rejecting…"
            onClick={handleReject}
            variant="destructive"
          >
            Reject
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function JournalEntryDetailPage({ params }: JournalEntryDetailPageProps) {
  const { entryId: entryIdStr } = use(params);
  const entryId = Number.parseInt(entryIdStr, 10);

  const query = useJournalEntry(entryId);
  const entry = query.data;
  const lines = entry?.lines ?? [];
  const debitTotal = sumColumn(lines, "debit");
  const creditTotal = sumColumn(lines, "credit");
  const isBalanced = Math.abs(debitTotal - creditTotal) < 0.005;

  const canManageJournal = useCan("accounting:journal:post");
  const canApproveJournal = useCan("accounting:journal:approve");

  const postMutation = usePostJournalEntry(entryId);
  const reverseMutation = useReverseJournalEntry(entryId);
  const submitApprovalMutation = useSubmitJournalApproval(entryId);

  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [reverseDialogOpen, setReverseDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const isDraft = entry?.status === "DRAFT";
  const isPosted = entry?.status === "POSTED";
  const isPendingApproval = entry?.status === "PENDING_APPROVAL";
  const isReverseEntry = entry?.sourceEvent === "reverse";
  const canReverse = Boolean(entry) && isPosted && !isReverseEntry;

  function handleRetry(): void {
    void query.refetch();
  }

  const handlePostClick = useCallback(() => {
    setPostDialogOpen(true);
  }, []);

  const handlePostConfirm = useCallback(() => {
    postMutation.mutate(undefined, {
      onSuccess: (result) => {
        setPostDialogOpen(false);
        toast.success(`Entry ${result.entryNumber} posted`);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
    });
  }, [postMutation]);

  const handleReverseClick = useCallback(() => {
    setReverseDialogOpen(true);
  }, []);

  const handleReverseConfirm = useCallback(() => {
    reverseMutation.mutate(undefined, {
      onSuccess: (result) => {
        setReverseDialogOpen(false);
        const label = result.created ? "Reversing entry created" : "Reversing entry already existed";
        toast.success(`${label}: ${result.entryNumber}`);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
    });
  }, [reverseMutation]);

  function handleSubmitApproval(): void {
    submitApprovalMutation.mutate(undefined, {
      onSuccess: () => toast.success("Submitted for approval"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleApproveClick(): void {
    setApproveDialogOpen(true);
  }

  function handleRejectClick(): void {
    setRejectDialogOpen(true);
  }

  return (
    <PageWrapper
      eyebrow="Accounting · Journal"
      title={entry ? entry.entryNumber : "Journal entry"}
      subtitle={entry ? formatDate(entry.entryDate) : "Loading journal entry…"}
      backHref="/accounting/journal"
      actions={
        <div className="flex items-center gap-2">
          {canManageJournal && isDraft && (
            <>
              <LoadingButton
                size="sm"
                isPending={submitApprovalMutation.isPending}
                loadingText="Submitting…"
                onClick={handleSubmitApproval}
                variant="outline"
              >
                <Send className="mr-1 h-4 w-4" />
                Submit for approval
              </LoadingButton>
              <Button size="sm" onClick={handlePostClick} disabled={postMutation.isPending}>
                <Send className="mr-1 h-4 w-4" />
                {postMutation.isPending ? "Posting…" : "Post entry"}
              </Button>
            </>
          )}
          {canManageJournal && canReverse && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReverseClick}
              disabled={reverseMutation.isPending}
            >
              <Undo2 className="mr-1 h-4 w-4" />
              Reverse this entry
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {query.isLoading ? (
          <LoadingState variant="form" rows={5} />
        ) : query.error ? (
          <ErrorState
            title="Failed to load journal entry"
            description={getErrorMessage(query.error)}
            onRetry={handleRetry}
          />
        ) : !entry || !Number.isInteger(entryId) ? (
          <ErrorState
            title="Journal entry not found"
            description="This journal entry does not exist or you do not have access to it."
          />
        ) : (
          <>
            {isPendingApproval && canApproveJournal && (
              <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-800 font-medium">
                    This entry is pending approval
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleRejectClick}>
                    Reject
                  </Button>
                  <Button size="sm" onClick={handleApproveClick}>
                    Approve
                  </Button>
                </div>
              </div>
            )}

            {entry.reversedEntryId && (
              <div className="text-xs text-muted-foreground">
                Reversed by{" "}
                <Link
                  href={`/accounting/journal/${entry.reversedEntryId}`}
                  className="text-blue-600 hover:underline font-mono"
                >
                  JE-{entry.reversedEntryId}
                </Link>
              </div>
            )}

            <Card>
              <CardContent className="p-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-500 leading-none">Date</p>
                    <p className="mt-1 text-sm font-medium text-foreground tabular-nums">
                      {formatDate(entry.entryDate)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-500 leading-none">Status</p>
                    <div className="mt-1">
                      <FinanceStatusBadge status={entry.status} size="chip" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-500 leading-none">
                      Source type
                    </p>
                    <p className="mt-1 text-sm text-foreground">{entry.sourceType}</p>
                  </div>
                  {entry.sourceId && (
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-slate-500 leading-none">
                        Source ID
                      </p>
                      <p className="mt-1 text-sm font-mono text-foreground truncate">
                        {entry.sourceId}
                      </p>
                    </div>
                  )}
                  {entry.sourceEvent && (
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-slate-500 leading-none">
                        Source event
                      </p>
                      <p className="mt-1 text-sm text-foreground">{entry.sourceEvent}</p>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-500 leading-none">
                      Created by
                    </p>
                    <p className="mt-1 text-sm text-foreground truncate">{entry.createdBy}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-500 leading-none">
                      Created at
                    </p>
                    <p className="mt-1 text-sm text-foreground tabular-nums">
                      {formatDateTime(entry.createdAt)}
                    </p>
                  </div>
                  {entry.description && (
                    <div className="min-w-0 col-span-2 sm:col-span-3 lg:col-span-4">
                      <p className="text-[11px] font-medium text-slate-500 leading-none">
                        Description
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                        {entry.description}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-10">
                      #
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[120px]">
                      Code
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
                      Account name
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[160px] text-right">
                      Debit
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[160px] text-right">
                      Credit
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
                      Description
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, index) => (
                    <TableRow key={line.id} className="border-b border-border/50 hover:bg-muted/30">
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {line.accountCode}
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{line.accountName}</TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums text-destructive">
                        {parseAmount(line.debit) > 0 ? formatAmount(parseAmount(line.debit)) : ""}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums text-emerald-600">
                        {parseAmount(line.credit) > 0
                          ? formatAmount(parseAmount(line.credit))
                          : ""}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {line.description ?? ""}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-t border-border">
                    <TableCell />
                    <TableCell />
                    <TableCell className="font-medium text-foreground text-sm">Total</TableCell>
                    <TableCell className="text-right font-mono font-medium tabular-nums text-foreground text-sm">
                      {formatAmount(debitTotal)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium tabular-nums text-foreground text-sm">
                      {formatAmount(creditTotal)}
                    </TableCell>
                    <TableCell>
                      {isBalanced ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Balanced
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          Unbalanced
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      <AlertDialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Post this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Posting is irreversible. The entry will be locked and recorded in the ledger.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={postMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePostConfirm} disabled={postMutation.isPending}>
              {postMutation.isPending ? "Posting…" : "Post entry"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reverseDialogOpen} onOpenChange={setReverseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverse this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new journal entry with debits and credits swapped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reverseMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReverseConfirm}
              disabled={reverseMutation.isPending}
            >
              {reverseMutation.isPending ? "Creating…" : "Create reversing entry"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ApproveDialog
        open={approveDialogOpen}
        onOpenChange={setApproveDialogOpen}
        entryId={entryId}
      />
      <RejectDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        entryId={entryId}
      />
    </PageWrapper>
  );
}
