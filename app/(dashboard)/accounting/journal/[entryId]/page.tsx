"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Send, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingState, ErrorState } from "@/components/shared";
import { useJournalEntry, usePostJournalEntry, useReverseJournalEntry } from "@/lib/api/hooks/accounting";
import { useAbility } from "@/lib/abilities-context";
import type { JournalEntryStatus, JournalLine } from "@/types/accounting";

interface JournalEntryDetailPageProps {
  params: Promise<{ entryId: string }>;
}

const STATUS_VARIANT: Record<JournalEntryStatus, "default" | "secondary" | "destructive"> = {
  POSTED: "default",
  DRAFT: "secondary",
  VOID: "destructive",
};

function formatDate(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function formatSource(sourceType: string, sourceEvent: string | null): string {
  if (sourceEvent) return `${sourceType} · ${sourceEvent}`;
  return sourceType;
}

function parseAmount(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatAmount(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function sumColumn(lines: JournalLine[], key: "debit" | "credit"): number {
  let total = 0;
  for (const line of lines) {
    total += parseAmount(line[key]);
  }
  return total;
}

export default function JournalEntryDetailPage({ params }: JournalEntryDetailPageProps) {
  const { entryId: entryIdStr } = use(params);
  const entryId = Number.parseInt(entryIdStr, 10);

  const query = useJournalEntry(entryId);
  const entry = query.data;
  const lines = entry?.lines ?? [];
  const debitTotal = sumColumn(lines, "debit");
  const creditTotal = sumColumn(lines, "credit");

  const ability = useAbility();
  const canManageJournal = ability.can("manage", "accounting:journal");
  const reverseMutation = useReverseJournalEntry(entryId);
  const [reverseDialogOpen, setReverseDialogOpen] = useState(false);

  const isReverseEntry = entry?.sourceEvent === "reverse";
  const isPosted = entry?.status === "POSTED";
  const canReverse = Boolean(entry) && isPosted && !isReverseEntry;

  function handleReverseClick() {
    setReverseDialogOpen(true);
  }

  function handleReverseCancel(open: boolean) {
    if (reverseMutation.isPending) return;
    setReverseDialogOpen(open);
  }

  function handleReverseConfirm() {
    reverseMutation.mutate(undefined, {
      onSuccess: (result) => {
        setReverseDialogOpen(false);
        const label = result.created ? "Reversing entry created" : "Reversing entry already existed";
        toast.success(`${label}: ${result.entryNumber}`);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  }

  const reverseButton = canManageJournal ? (
    <Button
      variant="outline"
      size="sm"
      onClick={handleReverseClick}
      disabled={!canReverse || reverseMutation.isPending}
    >
      <Undo2 className="mr-1 h-4 w-4" />
      Reverse this entry
    </Button>
  ) : null;

  const postMutation = usePostJournalEntry(entryId);
  const isDraft = entry?.status === "DRAFT";

  function handlePostClick(): void {
    postMutation.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(`Entry ${result.entryNumber} posted`);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  }

  const postButton = canManageJournal && isDraft ? (
    <Button
      size="sm"
      onClick={handlePostClick}
      disabled={postMutation.isPending}
    >
      <Send className="mr-1 h-4 w-4" />
      {postMutation.isPending ? "Posting…" : "Post entry"}
    </Button>
  ) : null;

  return (
    <PageWrapper
      eyebrow="Accounting · Journal"
      title={entry ? entry.entryNumber : "Journal entry"}
      subtitle={entry ? formatDate(entry.entryDate) : "Loading journal entry..."}
      actions={
        <div className="flex items-center gap-2">
          {postButton}
          {reverseButton}
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
            description={query.error.message}
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
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-blue-600 leading-none">
                      Date
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground tabular-nums">
                      {formatDate(entry.entryDate)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-blue-600 leading-none">
                      Source
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      {formatSource(entry.sourceType, entry.sourceEvent)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-blue-600 leading-none">
                      Status
                    </p>
                    <Badge variant={STATUS_VARIANT[entry.status]} className="mt-1">
                      {entry.status}
                    </Badge>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-blue-600 leading-none">
                      Description
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                      {entry.description ?? "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="w-[160px] text-right">Debit</TableHead>
                    <TableHead className="w-[160px] text-right">Credit</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="text-sm text-foreground">
                        <span className="font-mono text-xs text-muted-foreground">
                          {line.accountCode}
                        </span>
                        <span className="mx-2 text-muted-foreground">—</span>
                        <span>{line.accountName}</span>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-foreground">
                        {parseAmount(line.debit) > 0 ? formatAmount(parseAmount(line.debit)) : ""}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-foreground">
                        {parseAmount(line.credit) > 0 ? formatAmount(parseAmount(line.credit)) : ""}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {line.description ?? ""}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableCell className="font-medium text-foreground">Total</TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-foreground">
                      {formatAmount(debitTotal)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-foreground">
                      {formatAmount(creditTotal)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
      <ConfirmDialog
        open={reverseDialogOpen}
        onOpenChange={handleReverseCancel}
        title="Reverse journal entry?"
        description="This will create a new journal entry with debits and credits swapped. The original entry will remain unchanged."
        confirmLabel="Create reversing entry"
        isPending={reverseMutation.isPending}
        onConfirm={handleReverseConfirm}
      />
    </PageWrapper>
  );
}
