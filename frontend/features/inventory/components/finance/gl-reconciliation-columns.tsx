"use client";

import type { DataTableColumn } from "@/components/ui/data-table";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { formatShortDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import type { GlReconRow, GlReconStatus } from "@/hooks/api/inventory/gl-reconciliation";

export const GL_RECON_STATUS_LABEL: Record<GlReconStatus, string> = {
  MATCHED: "Matched",
  VALUE_MISMATCH: "Value mismatch",
  MISSING_COA: "No account mapped",
  UNMATCHED: "No journal entry",
  ACCOUNTING_NOT_INSTALLED: "Accounting not installed",
};

/**
 * `UNMATCHED` is the serious one: stock moved and money did not follow it.
 * `MISSING_COA` is a configuration gap the accounting module can close, and
 * `ACCOUNTING_NOT_INSTALLED` is not a fault at all — a tenant that has not
 * bought accounting has no gap.
 */
const GL_RECON_STATUS_TONE: Record<GlReconStatus, StatusTone> = {
  MATCHED: "success",
  VALUE_MISMATCH: "warning",
  MISSING_COA: "warning",
  UNMATCHED: "danger",
  ACCOUNTING_NOT_INSTALLED: "neutral",
};

function StatusCell({ row }: { row: GlReconRow }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-dense font-medium",
        statusToneClasses(GL_RECON_STATUS_TONE[row.status]),
      )}
    >
      {GL_RECON_STATUS_LABEL[row.status]}
    </span>
  );
}

function DocumentCell({ row }: { row: GlReconRow }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium">{row.label}</p>
      <p className="text-dense text-muted-foreground">
        {row.movementCount} {row.movementCount === 1 ? "movement" : "movements"} ·{" "}
        {formatShortDate(row.postedOn)}
      </p>
    </div>
  );
}

function JournalCell({ row }: { row: GlReconRow }) {
  if (row.journalEntryNumber === null)
    return (
      <span className="text-dense text-muted-foreground">
        {row.missingAccountCodes.length > 0
          ? `Missing account ${row.missingAccountCodes.join(", ")}`
          : "None"}
      </span>
    );
  return (
    <div className="min-w-0">
      <p className="truncate text-sm">{row.journalEntryNumber}</p>
      <p className="text-dense text-muted-foreground">
        {row.journalStatus ?? "—"}
        {row.journalEntryDate === null ? "" : ` · ${formatShortDate(row.journalEntryDate)}`}
      </p>
    </div>
  );
}

export const GL_RECON_COLUMNS: DataTableColumn<GlReconRow>[] = [
  { key: "status", header: "Status", cell: (row) => <StatusCell row={row} /> },
  { key: "document", header: "Source", cell: (row) => <DocumentCell row={row} /> },
  {
    key: "netQuantity",
    header: "Net qty",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums",
    cell: (row) => row.netQuantity,
  },
  {
    key: "movementValue",
    header: "Movement value",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums",
    cell: (row) => (row.hasCost ? row.movementValue : "Not costed"),
  },
  { key: "journal", header: "Journal entry", cell: (row) => <JournalCell row={row} /> },
  {
    key: "journalValue",
    header: "Journal value",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums",
    cell: (row) => row.journalValue ?? "—",
  },
];
