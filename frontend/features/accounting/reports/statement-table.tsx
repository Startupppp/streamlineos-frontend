"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { formatMinorMoney } from "@/lib/accounting/money";
import { cn } from "@/lib/utils";

export interface StatementRow {
  id: string;
  kind: "section" | "line" | "total" | "grand";
  label: string;
  code: string | null;
  accountId: string | null;
  amountMinor: number | null;
  priorAmountMinor: number | null;
  varianceMinor: number | null;
  hint?: string;
}

interface StatementTableProps {
  rows: StatementRow[];
  currency: string;
  accountHeader: string;
  amountHeader: string;
  priorHeader?: string;
  varianceHeader?: string;
  drillHref?: (accountId: string) => string;
  minWidth?: string;
}

function rowClassName(row: StatementRow): string {
  if (row.kind === "section") return "bg-muted/60 [&>td]:py-1.5";
  if (row.kind === "grand") return "bg-primary/5 font-semibold";
  if (row.kind === "total") return "border-t border-border font-semibold";
  return "";
}

function Amount({ value, currency }: { value: number | null; currency: string }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  return <span>{formatMinorMoney(value, currency)}</span>;
}

export function StatementTable({
  rows,
  currency,
  accountHeader,
  amountHeader,
  priorHeader,
  varianceHeader,
  drillHref,
  minWidth = "720px",
}: StatementTableProps) {
  const columns: DataTableColumn<StatementRow>[] = [
    {
      key: "label",
      header: accountHeader,
      className: "min-w-0",
      cell: (row) => {
        if (row.kind === "section")
          return (
            <span className="text-dense font-bold uppercase tracking-wider text-muted-foreground">
              {row.label}
            </span>
          );

        const body = (
          <span className={cn("truncate", row.kind === "line" ? "" : "font-semibold")}>
            {row.code ? <span className="mr-2 font-mono text-dense">{row.code}</span> : null}
            {row.label}
          </span>
        );

        return (
          <div className={cn("flex min-w-0 flex-col", row.kind === "line" ? "pl-3" : "")}>
            {row.accountId && drillHref ? (
              <Link
                href={drillHref(row.accountId)}
                className="truncate text-status-info-ink hover:underline"
              >
                {body}
              </Link>
            ) : (
              body
            )}
            {row.hint ? (
              <span className="truncate text-dense text-muted-foreground">{row.hint}</span>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "amount",
      header: amountHeader,
      className: "text-right font-mono tabular-nums whitespace-nowrap",
      headerClassName: "text-right",
      cell: (row) =>
        row.kind === "section" ? null : <Amount value={row.amountMinor} currency={currency} />,
    },
  ];

  if (priorHeader) {
    columns.push({
      key: "prior",
      header: priorHeader,
      className: "text-right font-mono tabular-nums whitespace-nowrap",
      headerClassName: "text-right",
      cell: (row) =>
        row.kind === "section" ? null : (
          <Amount value={row.priorAmountMinor} currency={currency} />
        ),
    });
  }

  if (varianceHeader) {
    columns.push({
      key: "variance",
      header: varianceHeader,
      className: "text-right font-mono tabular-nums whitespace-nowrap",
      headerClassName: "text-right",
      cell: (row) =>
        row.kind === "section" ? null : (
          <Amount value={row.varianceMinor} currency={currency} />
        ),
    });
  }

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="overflow-x-auto p-0">
        <DataTable
          data={rows}
          columns={columns}
          getRowKey={(row) => row.id}
          rowClassName={rowClassName}
          minWidth={minWidth}
          pagination={{ pageSize: 100 }}
        />
      </CardContent>
    </Card>
  );
}
