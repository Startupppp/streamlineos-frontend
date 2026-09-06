"use client";

import Link from "next/link";
import { AlertTriangle, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { FinanceStatusBadge } from "@/features/accounting/shared";
import type { FinanceStatus } from "@/features/accounting/shared";
import { useOpeningBalance } from "@/hooks/api/accounting/core";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
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
      <PageWrapper title="Opening Balances" subtitle="Set starting account balances.">
        <div className="flex flex-1 min-h-0 flex-col">
          <LoadingState variant="form" rows={8} />
        </div>
      </PageWrapper>
    );
  }

  if (query.error) {
    return (
      <PageWrapper title="Opening Balances" subtitle="Set starting account balances.">
        <div className="flex flex-1 min-h-0 flex-col">
          <ErrorState
            title="Failed to load opening balances"
            description={getErrorMessage(query.error)}
            onRetry={handleRetry}
          />
        </div>
      </PageWrapper>
    );
  }

  const response = query.data;
  const entry = response?.entry;

  return (
    <PageWrapper
      title="Opening Balances"
      subtitle="Set starting account balances."
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {entry && (
          <>
            <Card className="bg-card border border-border rounded-xl shadow-sm">
              <CardContent className="px-4 py-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <p className="text-dense font-medium text-muted-foreground">Entry #</p>
                    <Link
                      href={`/accounting/journal/${entry.id}`}
                      className="text-sm font-mono text-primary hover:underline"
                    >
                      {entry.entryNumber}
                    </Link>
                  </div>
                  <div>
                    <p className="text-dense font-medium text-muted-foreground">As of date</p>
                    <p className="text-sm text-foreground">{formatShortDate(entry.entryDate) || ""}</p>
                  </div>
                  <div>
                    <p className="text-dense font-medium text-muted-foreground">Status</p>
                    <div className="mt-0.5">
                      <FinanceStatusBadge status={toFinanceStatus(entry.status)} size="chip" />
                    </div>
                  </div>
                  <div>
                    <p className="text-dense font-medium text-muted-foreground">Lines</p>
                    <p className="text-sm text-foreground">{entry.lines.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-start gap-2 rounded-lg border border-status-warning-rule bg-status-warning-surface px-3 py-2.5">
              <AlertTriangle className="h-4 w-4 text-status-warning-ink shrink-0 mt-0.5" />
              <p className="text-xs text-status-warning-ink">
                Re-posting will reverse the existing entry and create a new one.
              </p>
            </div>
          </>
        )}

        {!entry && (
          <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
            <BookOpen className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-foreground">
              Enter your starting account balances as of the date you began using StreamlineOS.
            </p>
          </div>
        )}

        <OpeningBalancesEditor onSuccess={handleSuccess} />
      </div>
    </PageWrapper>
  );
}
