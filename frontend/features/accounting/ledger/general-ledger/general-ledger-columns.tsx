"use client";

import Link from "next/link";
import type { DataTableColumn } from "@/components/ui/data-table";
import { balanceDirection, formatMinorMoney } from "@/lib/accounting/money";
import { formatShortDate } from "@/lib/date-utils";
import type { AccountLedgerEntry } from "@/types/accounting/accounting-kernel";
import { JOURNAL_SOURCE_LABELS, sourceDocumentHref } from "./journal-source";

export function buildLedgerColumns(
  currency: string,
): DataTableColumn<AccountLedgerEntry>[] {
  return [
    {
      key: "journalDate",
      header: "Date",
      className: "font-mono text-dense tabular-nums whitespace-nowrap",
      cell: (row) => formatShortDate(row.journalDate),
    },
    {
      key: "journalNumber",
      header: "Journal",
      cell: (row) => (
        <Link
          href={`/accounting/journal/${row.journalId}`}
          className="font-mono text-dense text-status-info-ink hover:underline"
        >
          {row.journalNumber}
        </Link>
      ),
    },
    {
      key: "narration",
      header: "Narration",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm">
            {row.description ?? row.memo ?? "—"}
          </p>
          {row.description && row.memo ? (
            <p className="truncate text-dense text-muted-foreground">
              {row.memo}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "source",
      header: "Source",
      cell: (row) => {
        const href = sourceDocumentHref(row.sourceType, row.sourceId);
        const label = JOURNAL_SOURCE_LABELS[row.sourceType];
        return href ? (
          <Link
            href={href}
            className="text-dense text-status-info-ink hover:underline"
          >
            {label}
          </Link>
        ) : (
          <span className="text-dense text-muted-foreground">{label}</span>
        );
      },
    },
    {
      key: "debitMinor",
      header: "Debit",
      className: "font-mono text-dense tabular-nums text-right",
      headerClassName: "text-right",
      cell: (row) =>
        row.debitMinor > 0 ? formatMinorMoney(row.debitMinor, currency) : "—",
    },
    {
      key: "creditMinor",
      header: "Credit",
      className: "font-mono text-dense tabular-nums text-right",
      headerClassName: "text-right",
      cell: (row) =>
        row.creditMinor > 0 ? formatMinorMoney(row.creditMinor, currency) : "—",
    },
    {
      key: "runningBalanceMinor",
      header: "Balance",
      className: "font-mono text-dense tabular-nums text-right font-medium",
      headerClassName: "text-right",
      cell: (row) => (
        <span>
          {formatMinorMoney(Math.abs(row.runningBalanceMinor), currency)}
          <span className="ml-1 text-micro uppercase tracking-wider text-muted-foreground">
            {balanceDirection(row.runningBalanceMinor) === "debit"
              ? "Dr"
              : "Cr"}
          </span>
        </span>
      ),
    },
  ];
}
