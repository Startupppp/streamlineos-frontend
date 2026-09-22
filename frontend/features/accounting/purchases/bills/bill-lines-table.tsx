"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { formatMinorMoney } from "@/lib/accounting/money";
import { usePostableAccounts } from "@/hooks/api/accounting/ledger";
import type { ApDocumentLine } from "@/types/accounting/accounting-ap";
import { TAX_CATEGORY_LABELS } from "../lib/ap-labels";

interface BillLinesTableProps {
  lines: ApDocumentLine[];
  currency: string;
}

export function BillLinesTable({ lines, currency }: BillLinesTableProps) {
  const accountsQuery = usePostableAccounts();

  const accountNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const account of accountsQuery.data ?? [])
      map.set(account.id, account.name);
    return map;
  }, [accountsQuery.data]);

  const columns: DataTableColumn<ApDocumentLine>[] = [
    {
      key: "description",
      header: "What for",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{row.description}</p>
          <p className="text-dense text-muted-foreground">
            {TAX_CATEGORY_LABELS[row.taxCategory]}
            {row.commodityCode ? ` · ${row.commodityCode}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "account",
      header: "Goes to",
      cell: (row) => (
        <span className="truncate text-sm text-muted-foreground">
          {row.expenseAccountId
            ? (accountNames.get(row.expenseAccountId) ?? "—")
            : "—"}
        </span>
      ),
    },
    {
      key: "quantity",
      header: "Qty",
      className: "font-mono tabular-nums text-right",
      headerClassName: "text-right",
      cell: (row) => (row.quantityMilli / 1000).toString(),
    },
    {
      key: "unitPrice",
      header: "Price each",
      className: "font-mono tabular-nums text-right",
      headerClassName: "text-right",
      cell: (row) => formatMinorMoney(row.unitPriceMinor, currency),
    },
    {
      key: "net",
      header: "Before tax",
      className: "font-mono tabular-nums text-right",
      headerClassName: "text-right",
      cell: (row) => formatMinorMoney(row.lineNetMinor, currency),
    },
    {
      key: "tax",
      header: "Tax",
      className: "font-mono tabular-nums text-right",
      headerClassName: "text-right",
      cell: (row) => formatMinorMoney(row.lineTaxMinor, currency),
    },
    {
      key: "gross",
      header: "Total",
      className: "font-mono tabular-nums text-right",
      headerClassName: "text-right",
      cell: (row) => formatMinorMoney(row.lineGrossMinor, currency),
    },
    {
      key: "capitalize",
      header: "",
      cell: (row) =>
        row.capitalize ? (
          <SemanticBadge tone="info" size="xs" label="Owned asset" />
        ) : null,
    },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-sm font-semibold">
          Lines on this bill
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <DataTable
          data={lines}
          columns={columns}
          getRowKey={(row) => row.id}
          minWidth="1000px"
          pagination={{ pageSize: 50 }}
        />
      </CardContent>
    </Card>
  );
}
