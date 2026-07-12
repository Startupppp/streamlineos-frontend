"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { AppSheet } from "@/components/shared/app-sheet";
import { Money } from "@/features/accounting/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { useInvoices } from "@/hooks/api/invoice";
import type { Invoice, Payment, PaymentMethod } from "@/types/invoice";

type PaymentRow = {
  id: string;
  invoiceId: number;
  invoiceNumber: string;
  clientName: string;
  paymentDate: string;
  amount: string;
  paymentMethod: PaymentMethod;
  referenceNumber: string | null;
  notes: string | null;
  invoiceTotal: string;
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: "Bank Transfer",
  upi: "UPI",
  cheque: "Cheque",
  cash: "Cash",
  card: "Card",
  other: "Other",
};

const ALL_METHODS = "all" as const;

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

function derivePaymentRows(invoices: Invoice[]): PaymentRow[] {
  return invoices.flatMap((inv) =>
    (inv.payments ?? []).map((p: Payment, i: number) => ({
      id: `${inv.id}-${i}`,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.client?.name ?? "—",
      paymentDate: p.paymentDate,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      referenceNumber: p.referenceNumber,
      notes: p.notes,
      invoiceTotal: inv.total,
    })),
  );
}

interface PaymentDetailSheetProps {
  payment: PaymentRow | null;
  onClose: () => void;
}

function PaymentDetailSheet({ payment, onClose }: PaymentDetailSheetProps) {
  function handleOpenChange(open: boolean): void {
    if (!open) onClose();
  }

  if (!payment) return null;
  return (
    <AppSheet
      open={payment !== null}
      onOpenChange={handleOpenChange}
      title="Payment Detail"
    >
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Invoice</p>
            <p className="font-medium">{payment.invoiceNumber}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Customer</p>
            <p className="font-medium">{payment.clientName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Payment Date</p>
            <p className="font-medium">{formatDate(payment.paymentDate)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Method</p>
            <p className="font-medium">{METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Amount</p>
            <Money value={Number(payment.amount)} className="font-semibold text-base" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Invoice Total</p>
            <Money value={Number(payment.invoiceTotal)} />
          </div>
        </div>
        {payment.referenceNumber && (
          <div>
            <p className="text-xs text-muted-foreground">Reference #</p>
            <p className="font-mono text-sm">{payment.referenceNumber}</p>
          </div>
        )}
        {payment.notes && (
          <div>
            <p className="text-xs text-muted-foreground">Notes</p>
            <p className="text-sm">{payment.notes}</p>
          </div>
        )}
        <div className="pt-2">
          <Link
            href={`/accounting/invoices/${payment.invoiceId}`}
            className="text-blue-600 hover:underline text-sm"
          >
            View Invoice →
          </Link>
        </div>
      </div>
    </AppSheet>
  );
}

interface RowActionsProps {
  row: PaymentRow;
  onView: (row: PaymentRow) => void;
}

function PaymentRowActions({ row, onView }: RowActionsProps) {
  function handleViewDetails(): void {
    onView(row);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <span className="sr-only">Actions</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={handleViewDetails}>View Details</DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/accounting/invoices/${row.invoiceId}`}>View Invoice</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function PaymentsReceivedPage() {
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | typeof ALL_METHODS>(ALL_METHODS);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);

  const { data: invoiceData, isLoading, error, refetch } = useInvoices({ page: 1, limit: 100 });

  const allRows = useMemo(
    () => derivePaymentRows(invoiceData?.items ?? []),
    [invoiceData],
  );

  const filteredRows = useMemo(() => {
    if (methodFilter === ALL_METHODS) return allRows;
    return allRows.filter((r) => r.paymentMethod === methodFilter);
  }, [allRows, methodFilter]);

  function handleMethodFilterChange(value: string): void {
    setMethodFilter(value as PaymentMethod | typeof ALL_METHODS);
  }

  function handleViewPayment(row: PaymentRow): void {
    setSelectedPayment(row);
  }

  function handleCloseDetail(): void {
    setSelectedPayment(null);
  }

  function handleRetry(): void {
    void refetch();
    toast.info("Retrying…");
  }

  const columns: DataTableColumn<PaymentRow>[] = [
    {
      key: "invoiceNumber",
      header: "Invoice #",
      cell: (row) => (
        <Link href={`/accounting/invoices/${row.invoiceId}`} className="text-sm font-medium text-blue-600 hover:underline">
          {row.invoiceNumber}
        </Link>
      ),
    },
    {
      key: "clientName",
      header: "Customer",
      cell: (row) => <span className="text-sm">{row.clientName}</span>,
    },
    {
      key: "paymentDate",
      header: "Date",
      cell: (row) => <span className="text-sm tabular-nums text-muted-foreground">{formatDate(row.paymentDate)}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      cell: (row) => <Money value={Number(row.amount)} />,
    },
    {
      key: "paymentMethod",
      header: "Method",
      cell: (row) => (
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
          {METHOD_LABELS[row.paymentMethod] ?? row.paymentMethod}
        </Badge>
      ),
    },
    {
      key: "referenceNumber",
      header: "Reference",
      cell: (row) => (
        <span className="text-sm font-mono text-muted-foreground">
          {row.referenceNumber ?? "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => <PaymentRowActions row={row} onView={handleViewPayment} />,
      className: "w-10",
    },
  ];

  if (error) {
    return (
      <PageWrapper eyebrow="Accounting" title="Payments Received" subtitle="All payments collected against invoices">
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">{getErrorMessage(error)}</p>
          <Button variant="outline" size="sm" onClick={handleRetry}>Retry</Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      eyebrow="Accounting"
      title="Payments Received"
      subtitle="All payments collected against invoices"
      filters={
        <Select value={methodFilter} onValueChange={handleMethodFilterChange}>
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="All methods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_METHODS}>All methods</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            <SelectItem value="upi">UPI</SelectItem>
            <SelectItem value="cheque">Cheque</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      {filteredRows.length === 0 && !isLoading ? (
        <EmptyState
          illustrationPreset="expenses"
          title="No payments received"
          description="Record payments on invoices to see them here"
        />
      ) : (
        <DataTable
          data={filteredRows}
          columns={columns}
          getRowKey={(row) => row.id}
          isLoading={isLoading}
          onRowClick={handleViewPayment}
          pagination={{ pageSize: 50 }}
        />
      )}

      <PaymentDetailSheet payment={selectedPayment} onClose={handleCloseDetail} />
    </PageWrapper>
  );
}
