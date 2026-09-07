"use client";

import type { DataTableColumn } from "@/components/ui/data-table";
import { FinanceStatusBadge, Money } from "@/features/accounting/shared";
import { formatShortDate } from "@/lib/date-utils";
import type { Invoice } from "@/types/invoice";
import { toFinanceStatus } from "./invoice-status-map";
import { InvoiceRowActions } from "./invoice-row-actions";

export function buildInvoiceColumns(
  onRecordPayment: (invoice: Invoice) => void,
): DataTableColumn<Invoice>[] {
  return [
    {
      key: "invoiceNumber",
      header: "#",
      cell: (row) => (
        <span className="text-xs font-mono font-medium">{row.invoiceNumber}</span>
      ),
      sortable: true,
      sortValue: (row) => row.invoiceNumber,
    },
    {
      key: "client",
      header: "Customer",
      cell: (row) => <span className="text-xs">{row.client?.name ?? "—"}</span>,
    },
    {
      key: "createdAt",
      header: "Date",
      cell: (row) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatShortDate(row.createdAt) || "—"}
        </span>
      ),
      sortable: true,
      sortValue: (row) => new Date(row.createdAt).getTime(),
    },
    {
      key: "dueDate",
      header: "Due Date",
      cell: (row) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatShortDate(row.dueDate) || "—"}
        </span>
      ),
    },
    {
      key: "total",
      header: "Total",
      cell: (row) => <Money value={Number(row.total)} currency={row.currency} compact />,
      sortable: true,
      sortValue: (row) => Number(row.total),
    },
    {
      key: "balanceDue",
      header: "Balance Due",
      cell: (row) => {
        const amountPaid = Number(row.amountPaid ?? "0");
        const balance = Math.max(0, Number(row.total) - amountPaid);
        return <Money value={balance} currency={row.currency} compact />;
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <FinanceStatusBadge status={toFinanceStatus(row.status)} />,
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <InvoiceRowActions invoice={row} onRecordPayment={onRecordPayment} />
      ),
      className: "w-10",
    },
  ];
}
