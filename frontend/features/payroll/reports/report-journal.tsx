"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyReportIllustration } from "@/components/illustrations";
import { usePayrollJournal } from "@/hooks/api/payroll/reports";
import { useCan } from "@/hooks/api/access";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import { TruncatedText } from "@/components/ui/truncated-text";
import { AccountingMappingsSheet } from "./accounting-mappings-sheet";
import { JournalBatchesSheet } from "./journal-batches-sheet";
import type { JournalLine } from "@/types/payroll/reports";

interface ReportJournalProps {
  month: string;
}

const COLUMNS: DataTableColumn<JournalLine>[] = [
  {
    key: "account",
    header: "Account",
    cell: (row) => <TruncatedText text={row.account ?? ""} className="text-[11px] font-medium" />,
  },
  {
    key: "description",
    header: "Description",
    cell: (row) => <TruncatedText text={row.description ?? ""} className="text-[11px] text-muted-foreground" />,
  },
  {
    key: "debit",
    header: "Debit",
    className: "text-right",
    cell: (row) => (
      <span className="font-mono text-[11px] tabular-nums">
        {row.debit ? formatMoney(row.debit) : "—"}
      </span>
    ),
  },
  {
    key: "credit",
    header: "Credit",
    className: "text-right",
    cell: (row) => (
      <span className="font-mono text-[11px] tabular-nums">
        {row.credit ? formatMoney(row.credit) : "—"}
      </span>
    ),
  },
  {
    key: "costCenter",
    header: "Cost Center",
    cell: (row) => (
      <TruncatedText text={row.costCenter ?? "—"} className="text-[11px] text-muted-foreground" />
    ),
  },
];

export function ReportJournal({ month }: ReportJournalProps) {
  const [mappingSheetOpen, setMappingSheetOpen] = useState(false);
  const [batchesSheetOpen, setBatchesSheetOpen] = useState(false);
  const canViewBatches = useCan("payroll:accounting:view");
  const { data, isLoading } = usePayrollJournal(month);

  const lines = data?.lines ?? [];
  const unmappedCodes = data?.unmappedCodes ?? [];

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit), 0);

  const footerNode =
    lines.length > 0 ? (
      <span className="text-[11px] text-muted-foreground">
        Total Debit:{" "}
        <span className="font-mono">{formatMoney(totalDebit)}</span> · Total Credit:{" "}
        <span className="font-mono">{formatMoney(totalCredit)}</span>
        {Math.abs(totalDebit - totalCredit) < 0.01 && (
          <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-medium">✓ Balanced</span>
        )}
      </span>
    ) : undefined;

  function handleOpenMappingSheet() {
    setMappingSheetOpen(true);
  }

  function handleOpenBatchesSheet() {
    setBatchesSheetOpen(true);
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-3">
      {canViewBatches && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            This is the live journal. Posting it to the ledger creates an immutable, versioned
            batch you can reverse and reconcile.
          </p>
          <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={handleOpenBatchesSheet}>
            Journal batches
          </Button>
        </div>
      )}

      {unmappedCodes.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-[12px] font-semibold">Unmapped component codes</p>
            <p className="text-[11px] mt-1">
              <span className="font-mono">{unmappedCodes.join(", ")}</span> — these codes have no
              accounting mapping and were excluded from the journal.
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 ml-2 text-amber-800 underline text-[11px]"
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
            <p className="text-[11px] text-muted-foreground line-clamp-2">{row.description}</p>
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
