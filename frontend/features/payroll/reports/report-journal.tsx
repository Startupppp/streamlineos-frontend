"use client";

import { useCallback, useState } from "react";
import { AlertTriangle, CheckCircle2, Circle, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { EmptyReportIllustration } from "@/components/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { usePayrollJournal } from "@/hooks/api/payroll/reports";
import { usePeriodReconciliation } from "@/hooks/api/payroll/journal-batches";
import { useCan } from "@/hooks/api/access";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { AccountingMappingsSheet } from "./accounting-mappings-sheet";
import { JournalBatchesSheet } from "./journal-batches-sheet";
import type { JournalLine } from "@/types/payroll/reports";
import type { PeriodReconCheck } from "@/types/payroll/journal-batches";

interface ReportJournalProps {
  month: string;
}

const COLUMNS: DataTableColumn<JournalLine>[] = [
  {
    key: "account",
    header: "Account",
    cell: (row) => <TruncatedText text={row.account ?? ""} className="text-dense font-medium" />,
  },
  {
    key: "description",
    header: "Description",
    cell: (row) => <TruncatedText text={row.description ?? ""} className="text-dense text-muted-foreground" />,
  },
  {
    key: "debit",
    header: "Debit",
    className: "text-right",
    cell: (row) => (
      <span className="font-mono text-dense tabular-nums">
        {row.debit ? formatMoney(row.debit) : "—"}
      </span>
    ),
  },
  {
    key: "credit",
    header: "Credit",
    className: "text-right",
    cell: (row) => (
      <span className="font-mono text-dense tabular-nums">
        {row.credit ? formatMoney(row.credit) : "—"}
      </span>
    ),
  },
  {
    key: "costCenter",
    header: "Cost Center",
    cell: (row) => (
      <TruncatedText text={row.costCenter ?? "—"} className="text-dense text-muted-foreground" />
    ),
  },
];

function ReconCheckRow({ check }: { check: PeriodReconCheck }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      {check.ok ? (
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-success-ink" />
      ) : check.severity === "blocker" ? (
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-danger-ink" />
      ) : (
        <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-dense font-medium leading-snug",
            check.ok ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {check.label}
        </p>
        <p className="text-micro text-muted-foreground leading-snug mt-0.5">{check.detail}</p>
      </div>
    </div>
  );
}

export function ReportJournal({ month }: ReportJournalProps) {
  const [mappingSheetOpen, setMappingSheetOpen] = useState(false);
  const [batchesSheetOpen, setBatchesSheetOpen] = useState(false);
  const canViewBatches = useCan("payroll:accounting:view");
  const { data, isLoading, isError, error, refetch } = usePayrollJournal(month);
  const handleRetry = useCallback(() => void refetch(), [refetch]);
  const { data: recon, isLoading: reconLoading } = usePeriodReconciliation(
    month,
    canViewBatches,
  );

  const lines = data?.lines ?? [];
  const unmappedCodes = data?.unmappedCodes ?? [];

  // The server already summed both sides in integer paise across the whole run.
  // Re-deriving them here from `lines` in float made this footer answer a
  // different question — the total of what is on screen — and then print a
  // balance verdict on it. Compare the server's own two figures, in paise, so
  // "Balanced" means the journal balances rather than the table adding up.
  const totalDebit = data?.totalDebits ?? 0;
  const totalCredit = data?.totalCredits ?? 0;
  const balanced = Math.round(totalDebit * 100) === Math.round(totalCredit * 100);

  const footerNode =
    lines.length > 0 ? (
      <span className="text-dense text-muted-foreground">
        Total Debit:{" "}
        <span className="font-mono">{formatMoney(totalDebit)}</span> · Total Credit:{" "}
        <span className="font-mono">{formatMoney(totalCredit)}</span>
        {balanced && (
          <span className="ml-2 text-status-success-ink font-medium">✓ Balanced</span>
        )}
      </span>
    ) : undefined;

  function handleOpenMappingSheet() {
    setMappingSheetOpen(true);
  }

  function handleOpenBatchesSheet() {
    setBatchesSheetOpen(true);
  }

  if (isError) {
    return (
      <ErrorState
        className="flex-1"
        title="Couldn't load the payroll journal"
        description={getErrorMessage(error)}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-3">
      {canViewBatches && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-dense text-muted-foreground">
            This is the live journal. Posting it to the ledger creates an immutable, versioned
            batch you can reverse and reconcile.
          </p>
          <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={handleOpenBatchesSheet}>
            Journal batches
          </Button>
        </div>
      )}

      {canViewBatches && (
        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground">
                  Period reconciliation
                  {recon && (
                    <span
                      className={cn(
                        "ml-2 text-micro font-medium px-1.5 py-0.5 rounded border",
                        recon.overallOk
                          ? "bg-status-success-surface text-status-success-ink border-status-success-rule"
                          : "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
                      )}
                    >
                      {recon.overallOk
                        ? "No blockers"
                        : `${recon.blockerCount} blocker(s)`}
                      {recon.warningCount > 0 ? ` · ${recon.warningCount} warning(s)` : ""}
                    </span>
                  )}
                </p>
                {recon && (
                  <span className="text-micro text-muted-foreground tabular-nums">
                    Paid {formatMoney(recon.payout.totalPaid)}
                    {recon.run ? ` · Run net ${formatMoney(recon.run.netTotal)}` : ""}
                  </span>
                )}
              </div>
              <p className="text-micro text-muted-foreground mt-0.5 leading-snug">
                {recon?.honestyNote ??
                  "Compares run, payout, and journal outbox — not bank statement or GL auto-post."}
              </p>
            </div>
          </div>
          {reconLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : recon ? (
            <div className="grid gap-x-4 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
              <div className="sm:pr-3">
                {recon.checks.slice(0, Math.ceil(recon.checks.length / 2)).map((c) => (
                  <ReconCheckRow key={c.key} check={c} />
                ))}
              </div>
              <div className="sm:pl-3">
                {recon.checks.slice(Math.ceil(recon.checks.length / 2)).map((c) => (
                  <ReconCheckRow key={c.key} check={c} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {unmappedCodes.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-status-warning-rule bg-status-warning-surface p-3 text-status-warning-ink">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning-ink" />
          <div>
            <p className="text-xs font-semibold">Unmapped component codes</p>
            <p className="text-dense mt-1">
              <span className="font-mono">{unmappedCodes.join(", ")}</span> — these codes have no
              accounting mapping and were excluded from the journal.
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 ml-2 text-status-warning-ink underline text-dense"
                onClick={handleOpenMappingSheet}
              >
                Map now
              </Button>
            </p>
          </div>
        </div>
      )}

      <DataTable
        className="flex-1 min-h-0"
        data={lines}
        columns={COLUMNS}
        getRowKey={(row) => `${row.account}-${row.description}`}
        isLoading={isLoading}
        minWidth="700px"
        footer={footerNode}
        mobileCard={(row) => (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-medium truncate">{row.account}</span>
              <span className="font-mono tabular-nums text-xs shrink-0">
                {row.debit
                  ? `Dr ${formatMoney(row.debit)}`
                  : row.credit
                    ? `Cr ${formatMoney(row.credit)}`
                    : "—"}
              </span>
            </div>
            <p className="text-dense text-muted-foreground line-clamp-2">{row.description}</p>
          </div>
        )}
        emptyState={
          <EmptyState
            compact
            illustration={<EmptyReportIllustration />}
            title="No journal lines"
            description="Journal entries are generated from locked payroll runs with accounting mappings."
          />
        }
      />

      <AccountingMappingsSheet
        open={mappingSheetOpen}
        onOpenChange={setMappingSheetOpen}
      />

      <JournalBatchesSheet
        open={batchesSheetOpen}
        onOpenChange={setBatchesSheetOpen}
        month={month}
      />
    </div>
  );
}
