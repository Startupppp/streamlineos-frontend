"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
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
import { ErrorState } from "@/components/shared";
import { AppSheet } from "@/components/shared/app-sheet";
import { Money } from "@/features/accounting/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { useArPayments } from "@/hooks/api/accounting/ar";
import type { ArPayment, ArPaymentMethod } from "@/types/accounting/ar";

const METHOD_LABELS: Record<ArPaymentMethod, string> = {
  bank_transfer: "Bank Transfer",
  upi: "UPI",
  cheque: "Cheque",
  cash: "Cash",
  card: "Card",
  other: "Other",
};

const PAYMENT_METHOD_VALUES: ArPaymentMethod[] = [
  "bank_transfer",
  "upi",
  "cheque",
  "cash",
  "card",
  "other",
];

const ALL_METHODS = "all" as const;

function isArPaymentMethod(value: string): value is ArPaymentMethod {
  return (PAYMENT_METHOD_VALUES as string[]).includes(value);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

interface PaymentDetailSheetProps {
  payment: ArPayment | null;
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
            <p className="font-medium">{payment.clientName ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Payment Date</p>
            <p className="font-medium">{formatDate(payment.paymentDate)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Method</p>
            <p className="font-medium">{METHOD_LABELS[payment.paymentMethod]}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Amount</p>
            <Money value={Number(payment.amount)} className="font-semibold text-base" />
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
        {payment.allocations.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Allocations</p>
            <div className="space-y-1">
              {payment.allocations.map((alloc) => (
                <div key={alloc.invoiceId} className="flex justify-between text-xs">
                  <Link
                    href={`/accounting/invoices/${alloc.invoiceId}`}
                    className="text-primary hover:underline"
                  >
                    Invoice #{alloc.invoiceId}
                  </Link>
                  <Money value={Number(alloc.amount)} />
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="pt-2">
          <Link
            href={`/accounting/invoices/${payment.invoiceId}`}
            className="text-primary hover:underline text-sm"
          >
            View Invoice →
          </Link>
        </div>
      </div>
    </AppSheet>
  );
}

interface RowActionsProps {
  row: ArPayment;
  onView: (row: ArPayment) => void;
}

function PaymentRowActions({ row, onView }: RowActionsProps) {
  function handleViewDetails(): void {
    onView(row);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AnimatedIconButton icon={EllipsisIcon} iconSize={14} variant="ghost" size="icon" className="w-7" aria-label="Payment actions" />
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
  const [methodFilter, setMethodFilter] = useState<ArPaymentMethod | typeof ALL_METHODS>(ALL_METHODS);
  const [page, setPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<ArPayment | null>(null);

  const { data, isLoading, error, refetch } = useArPayments({
    method: methodFilter === ALL_METHODS ? undefined : methodFilter,
    page,
    pageSize: 50,
  });

  function handleMethodFilterChange(value: string): void {
    if (value === ALL_METHODS) {
      setMethodFilter(ALL_METHODS);
    } else if (isArPaymentMethod(value)) {
      setMethodFilter(value);
    }
    setPage(1);
  }

  function handleViewPayment(row: ArPayment): void {
    setSelectedPayment(row);
  }

  function handleCloseDetail(): void {
    setSelectedPayment(null);
  }

  function handleRetry(): void {
    void refetch();
    toast.info("Retrying…");
  }

  const columns: DataTableColumn<ArPayment>[] = [
    {
      key: "invoiceNumber",
      header: "Invoice #",
      cell: (row) => (
        <Link href={`/accounting/invoices/${row.invoiceId}`} className="text-sm font-medium text-primary hover:underline">
          {row.invoiceNumber}
        </Link>
      ),
    },
    {
      key: "clientName",
      header: "Customer",
      cell: (row) => <span className="text-sm">{row.clientName ?? "—"}</span>,
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
        <Badge variant="outline" className="text-micro px-1.5 py-0 h-4">
          {METHOD_LABELS[row.paymentMethod]}
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
      <PageWrapper title="Payments Received" subtitle="All payments collected against invoices">
        <ErrorState
          title="Failed to load payments"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Payments Received"
      subtitle="All payments collected against invoices"
      filters={
        <Select value={methodFilter} onValueChange={handleMethodFilterChange}>
          <SelectTrigger className={`w-[160px] ${FILTER_SELECT_TRIGGER}`}>
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
      <div className="flex flex-1 min-h-0 flex-col">
        {data?.items.length === 0 && !isLoading ? (
          <EmptyState
            illustrationPreset="expenses"
            title="No payments received"
            description="Record payments on invoices to see them here"
          />
        ) : (
          <DataTable
            data={data?.items ?? []}
            columns={columns}
            getRowKey={(row) => String(row.id)}
            isLoading={isLoading}
            onRowClick={handleViewPayment}
            className="flex-1 min-h-0"
            pagination={{
              pageSize: 50,
              page,
              total: data?.total ?? 0,
              onPageChange: setPage,
            }}
          />
        )}
      </div>

      <PaymentDetailSheet payment={selectedPayment} onClose={handleCloseDetail} />
    </PageWrapper>
  );
}
