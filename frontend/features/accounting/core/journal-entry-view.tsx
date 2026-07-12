"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FinanceStatusBadge } from "@/features/accounting/shared";
import { JournalLinesTable } from "./journal-lines-table";
import type { JournalLine } from "@/types/accounting";

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

interface JournalEntry {
  entryNumber: string;
  entryDate: string;
  status: string;
  sourceType: string;
  sourceId?: string | null;
  sourceEvent?: string | null;
  createdBy: string;
  createdAt: Date;
  description?: string | null;
  reversedEntryId?: number | null;
  lines: JournalLine[];
}

interface JournalEntryViewProps {
  entry: JournalEntry;
  isPendingApproval: boolean;
  canApproveJournal: boolean;
  onApproveClick: () => void;
  onRejectClick: () => void;
}

export function JournalEntryView({
  entry,
  isPendingApproval,
  canApproveJournal,
  onApproveClick,
  onRejectClick,
}: JournalEntryViewProps) {
  const lines = entry.lines;
  const debitTotal = lines.reduce((acc, l) => acc + parseAmount(l.debit), 0);
  const creditTotal = lines.reduce((acc, l) => acc + parseAmount(l.credit), 0);
  const isBalanced = Math.abs(debitTotal - creditTotal) < 0.005;

  return (
    <div className="space-y-4">
      {isPendingApproval && canApproveJournal && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 font-medium">
              This entry is pending approval
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onRejectClick}>
              Reject
            </Button>
            <Button size="sm" onClick={onApproveClick}>
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
              <p className="text-[11px] font-medium text-slate-500 leading-none">Source type</p>
              <p className="mt-1 text-sm text-foreground">{entry.sourceType}</p>
            </div>
            {entry.sourceId && (
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-500 leading-none">Source ID</p>
                <p className="mt-1 text-sm font-mono text-foreground truncate">{entry.sourceId}</p>
              </div>
            )}
            {entry.sourceEvent && (
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-500 leading-none">Source event</p>
                <p className="mt-1 text-sm text-foreground">{entry.sourceEvent}</p>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-500 leading-none">Created by</p>
              <p className="mt-1 text-sm text-foreground truncate">{entry.createdBy}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-500 leading-none">Created at</p>
              <p className="mt-1 text-sm text-foreground tabular-nums">
                {formatDateTime(entry.createdAt)}
              </p>
            </div>
            {entry.description && (
              <div className="min-w-0 col-span-2 sm:col-span-3 lg:col-span-4">
                <p className="text-[11px] font-medium text-slate-500 leading-none">Description</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {entry.description}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <JournalLinesTable
        lines={lines}
        debitTotal={debitTotal}
        creditTotal={creditTotal}
        isBalanced={isBalanced}
      />
    </div>
  );
}
