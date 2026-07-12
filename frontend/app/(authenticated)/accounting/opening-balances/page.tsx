"use client";

import Link from "next/link";
import { AlertTriangle, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingState, ErrorState } from "@/components/shared";
import { FinanceStatusBadge } from "@/features/accounting/shared";
import type { FinanceStatus } from "@/features/accounting/shared";
import { useOpeningBalance } from "@/hooks/api/accounting/core";
import { OpeningBalancesEditor } from "@/features/accounting/core/opening-balances-editor";

const KNOWN_FINANCE_STATUSES: readonly FinanceStatus[] = [
  "DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "VOID",
  "PENDING_APPROVAL", "POSTED", "CANCELLED", "SUBMITTED", "APPROVED",
  "REIMBURSEMENT_PENDING", "REIMBURSED", "REJECTED",
  "OPEN", "CLOSING", "CLOSED", "LOCKED", "PENDING",
];

function isFinanceStatus(value: string): value is FinanceStatus {
  return (KNOWN_FINANCE_STATUSES as readonly string[]).includes(value);
}

function toFinanceStatus(value: string): FinanceStatus {
  return isFinanceStatus(value) ? value : "DRAFT";
}

function formatDate(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export default function OpeningBalancesPage() {
  const query = useOpeningBalance();

  function handleRetry(): void {
    void query.refetch();
  }

  function handleSuccess(): void {
    void query.refetch();
  }

  if (query.isLoading) {
    return (
      <PageWrapper eyebrow="Accounting" title="Opening Balances" subtitle="Set starting account balances.">
        <LoadingState variant="form" rows={6} />
      </PageWrapper>
    );
  }

  if (query.error) {
    return (
      <PageWrapper eyebrow="Accounting" title="Opening Balances" subtitle="Set starting account balances.">
        <ErrorState
          title="Failed to load opening balances"
          description={query.error.message}
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  const response = query.data;
  const entry = response?.entry;

  return (
    <PageWrapper
      eyebrow="Accounting"
      title="Opening Balances"
      subtitle="Set starting account balances."
    >
      <div className="space-y-4 max-w-3xl">
        {entry && (
          <>
            <Card className="bg-card border border-border rounded-xl shadow-sm">
              <CardContent className="px-4 py-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">Entry #</p>
                    <Link
                      href={`/accounting/journal/${entry.id}`}
                      className="text-sm font-mono text-blue-600 hover:underline"
                    >
                      {entry.entryNumber}
                    </Link>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">As of date</p>
                    <p className="text-sm text-foreground">{formatDate(entry.entryDate)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">Status</p>
                    <div className="mt-0.5">
                      <FinanceStatusBadge status={toFinanceStatus(entry.status)} size="chip" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">Lines</p>
                    <p className="text-sm text-foreground">{entry.lines.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Re-posting will reverse the existing entry and create a new one.
              </p>
            </div>
          </>
        )}

        {!entry && (
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
            <BookOpen className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800">
              Enter your starting account balances as of the date you began using StreamlineOS.
            </p>
          </div>
        )}

        <OpeningBalancesEditor onSuccess={handleSuccess} />
      </div>
    </PageWrapper>
  );
}
