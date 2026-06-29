"use client";

import { use, useCallback, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Send, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { LoadingState, ErrorState } from "@/components/shared";
import {
  useJournalEntry,
  usePostJournalEntry,
  useReverseJournalEntry,
} from "@/hooks/api/accounting";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import type { JournalEntryStatus, JournalLine } from "@/types/accounting";

interface JournalEntryDetailPageProps {
  params: Promise<{ entryId: string }>;
}

const STATUS_CLASSES: Record<JournalEntryStatus, string> = {
  DRAFT: "bg-amber-50 text-amber-700 border border-amber-200/70",
  POSTED: "bg-emerald-50 text-emerald-700 border border-emerald-200/70",
  VOID: "bg-slate-100 text-slate-600 border border-slate-200/70",
};

function StatusBadge({ status }: { status: JournalEntryStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium tabular-nums ${STATUS_CLASSES[status]}`}
    >
      {status}
    </span>
  );
}

function formatDate(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
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
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function sumColumn(lines: JournalLine[], key: "debit" | "credit"): number {
  return lines.reduce((total, line) => total + parseAmount(line[key]), 0);
}

export default function JournalEntryDetailPage({
  params,
}: JournalEntryDetailPageProps) {
  const { entryId: entryIdStr } = use(params);
  const entryId = Number.parseInt(entryIdStr, 10);

  const query = useJournalEntry(entryId);
  const entry = query.data;
  const lines = entry?.lines ?? [];
  const debitTotal = sumColumn(lines, "debit");
  const creditTotal = sumColumn(lines, "credit");
  const isBalanced = Math.abs(debitTotal - creditTotal) < 0.005;

  const canManageJournal = useCan("accounting:manage");

  const postMutation = usePostJournalEntry(entryId);
  const reverseMutation = useReverseJournalEntry(entryId);

  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [reverseDialogOpen, setReverseDialogOpen] = useState(false);

  const isDraft = entry?.status === "DRAFT";
  const isPosted = entry?.status === "POSTED";
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
        const label = result.created
          ? "Reversing entry created"
          : "Reversing entry already existed";
        toast.success(`${label}: ${result.entryNumber}`);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
    });
  }, [reverseMutation]);

  return (
    <PageWrapper
      eyebrow="Accounting · Journal"
      title={entry ? entry.entryNumber : "Journal entry"}
      subtitle={entry ? formatDate(entry.entryDate) : "Loading journal entry…"}
      actions={
        <div className="flex items-center gap-2">
          {canManageJournal && isDraft && (
            <Button
              size="sm"
              onClick={handlePostClick}
              disabled={postMutation.isPending}
            >
              <Send className="mr-1 h-4 w-4" />
              {postMutation.isPending ? "Posting…" : "Post entry"}
            </Button>
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
          <Button variant="ghost" size="sm" asChild>
            <Link href="/accounting/journal">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to journal
            </Link>
          </Button>
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
            <Card>
              <CardContent className="p-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-500 leading-none">
                      Date
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground tabular-nums">
                      {formatDate(entry.entryDate)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-500 leading-none">
                      Status
                    </p>
                    <div className="mt-1">
                      <StatusBadge status={entry.status} />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-500 leading-none">
                      Source type
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      {entry.sourceType}
                    </p>
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
                      <p className="mt-1 text-sm text-foreground">
                        {entry.sourceEvent}
                      </p>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-500 leading-none">
                      Created by
                    </p>
                    <p className="mt-1 text-sm text-foreground truncate">
                      {entry.createdBy}
                    </p>
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

            <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead className="w-[120px]">Code</TableHead>
                    <TableHead>Account name</TableHead>
                    <TableHead className="w-[160px] text-right">
                      Debit
                    </TableHead>
                    <TableHead className="w-[160px] text-right">
                      Credit
                    </TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, index) => (
                    <TableRow key={line.id}>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {line.accountCode}
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {line.accountName}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-foreground">
                        {parseAmount(line.debit) > 0
                          ? formatAmount(parseAmount(line.debit))
                          : ""}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-foreground">
                        {parseAmount(line.credit) > 0
                          ? formatAmount(parseAmount(line.credit))
                          : ""}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {line.description ?? ""}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell />
                    <TableCell />
                    <TableCell className="font-medium text-foreground text-sm">
                      Total
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-foreground text-sm">
                      {formatAmount(debitTotal)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-foreground text-sm">
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
              Posting is irreversible. The entry will be locked and recorded in
              the ledger. You will need to create a reversing entry to undo it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={postMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePostConfirm}
              disabled={postMutation.isPending}
            >
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
              This will create a new journal entry with debits and credits
              swapped. The original entry will remain unchanged. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reverseMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReverseConfirm}
              disabled={reverseMutation.isPending}
            >
              {reverseMutation.isPending
                ? "Creating…"
                : "Create reversing entry"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
