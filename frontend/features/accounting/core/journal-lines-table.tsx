"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { JournalLine } from "@/types/accounting";

function parseAmount(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatAmount(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export interface JournalLinesTableProps {
  lines: JournalLine[];
  debitTotal: number;
  creditTotal: number;
  isBalanced: boolean;
}

function buildColumns(lines: JournalLine[]): DataTableColumn<JournalLine>[] {
  return [
    {
      key: "index",
      header: "#",
      headerClassName: "w-10",
      className: "w-10 text-sm text-muted-foreground tabular-nums",
      cell: (row) => lines.indexOf(row) + 1,
    },
    {
      key: "accountCode",
      header: "Code",
      headerClassName: "w-[120px]",
      className: "w-[120px] font-mono text-xs text-muted-foreground",
      cell: (row) => row.accountCode,
    },
    {
      key: "accountName",
      header: "Account name",
      cell: (row) => <TruncatedText text={row.accountName} className="text-sm text-foreground" />,
    },
    {
      key: "debit",
      header: "Debit",
      headerClassName: "w-[160px] text-right",
      className: "w-[160px] text-right font-mono text-sm tabular-nums text-destructive",
      cell: (row) => {
        const v = parseAmount(row.debit);
        return v > 0 ? formatAmount(v) : "";
      },
    },
    {
      key: "credit",
      header: "Credit",
      headerClassName: "w-[160px] text-right",
      className: "w-[160px] text-right font-mono text-sm tabular-nums text-status-success-ink",
      cell: (row) => {
        const v = parseAmount(row.credit);
        return v > 0 ? formatAmount(v) : "";
      },
    },
    {
      key: "description",
      header: "Description",
      cell: (row) => row.description ? (
        <TruncatedText text={row.description} lines={2} className="text-sm text-muted-foreground" />
      ) : null,
    },
  ];
}

export function JournalLinesTable({ lines, debitTotal, creditTotal, isBalanced }: JournalLinesTableProps) {
  const footer = (
    <div className="flex items-center gap-2 text-sm">
      <span className="flex-1 font-medium text-foreground">Total</span>
      <span className="w-[160px] text-right font-mono font-medium tabular-nums text-foreground">
        {formatAmount(debitTotal)}
      </span>
      <span className="w-[160px] text-right font-mono font-medium tabular-nums text-foreground">
        {formatAmount(creditTotal)}
      </span>
      <span>
        {isBalanced ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-status-success-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-status-success-fill" />
            Balanced
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-status-danger-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-status-danger-fill" />
            Unbalanced
          </span>
        )}
      </span>
    </div>
  );

  return (
    <DataTable
      data={lines}
      columns={buildColumns(lines)}
      getRowKey={(row) => row.id}
      footer={footer}
    />
  );
}
