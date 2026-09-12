"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { formatBasisPoints, formatMinorMoney } from "@/lib/accounting/money";
import { formatShortDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import type { ArDocumentLineView, ArDocumentView } from "@/types/accounting-ar";
import type { FrozenTaxLine } from "@/types/accounting-ar-receipts";
import { quantityLabel } from "./ar-document-schema";

function AmountRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className={cn("text-label", emphasis ? "font-medium" : "text-muted-foreground")}>
        {label}
      </span>
      <span
        className={cn("font-mono tabular-nums", emphasis ? "text-sm font-semibold" : "text-label")}
      >
        {value}
      </span>
    </div>
  );
}

export function ArDocumentLinesCard({ arDocument }: { arDocument: ArDocumentView }) {
  const columns: DataTableColumn<ArDocumentLineView>[] = [
    {
      key: "description",
      header: "What was billed",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{row.description}</p>
          {row.commodityCode ? (
            <p className="font-mono text-dense text-muted-foreground">{row.commodityCode}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: "quantityMilli",
      header: "Qty",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums">{quantityLabel(row.quantityMilli)}</span>
      ),
    },
    {
      key: "unitPriceMinor",
      header: "Unit price",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums">
          {formatMinorMoney(row.unitPriceMinor, arDocument.currency)}
        </span>
      ),
    },
    {
      key: "discountMinor",
      header: "Discount",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums">
          {formatMinorMoney(row.discountMinor, arDocument.currency)}
        </span>
      ),
    },
    {
      key: "lineNetMinor",
      header: "Before tax",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums">
          {formatMinorMoney(row.lineNetMinor, arDocument.currency)}
        </span>
      ),
    },
    {
      key: "lineTaxMinor",
      header: "Tax",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums">
          {formatMinorMoney(row.lineTaxMinor, arDocument.currency)}
        </span>
      ),
    },
    {
      key: "lineGrossMinor",
      header: "Total",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense font-medium tabular-nums">
          {formatMinorMoney(row.lineGrossMinor, arDocument.currency)}
        </span>
      ),
    },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>What was billed</CardTitle>
        <CardDescription>
          Frozen as it was posted. A posted document is never edited.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <DataTable
          data={arDocument.lines}
          columns={columns}
          getRowKey={(row) => row.id}
          minWidth="900px"
        />
      </CardContent>
    </Card>
  );
}

export function ArDocumentTotalsCard({
  arDocument,
  partyName,
}: {
  arDocument: ArDocumentView;
  partyName: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>The numbers</CardTitle>
        <CardDescription>Straight from the ledger.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="divide-y divide-border/60">
          <div className="flex items-center justify-between gap-3 py-1">
            <span className="text-label text-muted-foreground">Customer</span>
            <Link
              href={`/accounting/customers/${arDocument.partyId}`}
              className="min-w-0 truncate text-label text-status-info-ink hover:underline"
            >
              {partyName}
            </Link>
          </div>
          <AmountRow label="Issued" value={formatShortDate(arDocument.issueDate)} />
          <AmountRow
            label="Due"
            value={arDocument.dueDate ? formatShortDate(arDocument.dueDate) : "On receipt"}
          />
        </div>
        <div className="divide-y divide-border/60">
          <AmountRow
            label="Before tax"
            value={formatMinorMoney(arDocument.netMinor, arDocument.currency)}
          />
          <AmountRow label="Tax" value={formatMinorMoney(arDocument.taxMinor, arDocument.currency)} />
          {arDocument.roundingMinor !== 0 ? (
            <AmountRow
              label="Rounding"
              value={formatMinorMoney(arDocument.roundingMinor, arDocument.currency)}
            />
          ) : null}
          <AmountRow
            label="Total"
            value={formatMinorMoney(arDocument.grossMinor, arDocument.currency)}
            emphasis
          />
          <AmountRow
            label="Settled"
            value={formatMinorMoney(arDocument.settledMinor, arDocument.currency)}
          />
          <AmountRow
            label="Still open"
            value={formatMinorMoney(arDocument.openMinor, arDocument.currency)}
            emphasis
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function FrozenTaxLinesCard({
  lines,
  currency,
}: {
  lines: FrozenTaxLine[];
  currency: string;
}) {
  if (lines.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax as filed</CardTitle>
        <CardDescription>
          The verdict the tax engine froze at posting, exactly as the return will read it.
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y divide-border/60">
        {lines.map((line, index) => (
          <AmountRow
            key={`${line.component}-${line.jurisdiction}-${line.documentLineId ?? index}`}
            label={`${line.component} ${formatBasisPoints(line.rateBp)} · ${line.jurisdiction}`}
            value={formatMinorMoney(line.taxMinor, line.currency || currency)}
          />
        ))}
      </CardContent>
    </Card>
  );
}
