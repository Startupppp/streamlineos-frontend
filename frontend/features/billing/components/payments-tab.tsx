"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useSubscription } from "@/hooks/api/subscription";
import { getErrorMessage } from "@/lib/get-error-message";

interface Payment {
  id: number;
  razorpayPaymentId: string | null;
  amount: string | number | null;
  amountPaise: number;
  currency: string;
  paidAt: string | null;
  status: string;
}

function fmtAmount(amount: string | number | null, amountPaise: number, currency: string): string {
  const value = amount !== null ? Number(amount) : amountPaise / 100;
  const symbol = currency === "INR" ? "₹" : currency;
  return `${symbol}${value.toLocaleString("en-IN")}`;
}

const PAYMENT_COLUMNS: DataTableColumn<Payment>[] = [
  {
    key: "paymentId",
    header: "Payment ID",
    className: "text-xs font-mono text-muted-foreground",
    cell: (row): ReactNode => row.razorpayPaymentId ?? "—",
  },
  {
    key: "amount",
    header: "Amount",
    className: "text-xs font-medium text-foreground",
    cell: (row): ReactNode => fmtAmount(row.amount, row.amountPaise, row.currency),
  },
  {
    key: "date",
    header: "Date",
    className: "text-xs text-muted-foreground",
    cell: (row): ReactNode =>
      row.paidAt
        ? new Date(row.paidAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "—",
  },
  {
    key: "status",
    header: "Status",
    cell: (row): ReactNode => (
      <Badge variant="secondary" className="text-micro">
        {row.status}
      </Badge>
    ),
  },
];

function getPaymentRowKey(row: Payment): string | number {
  return row.id;
}

const EMPTY_STATE = (
  <EmptyState
    className="min-h-0 flex-1 border-0 bg-transparent"
    title="No payments yet"
    description="Subscription payment history will appear here after your first payment."
  />
);

export function PaymentsTab() {
  const { data, isLoading, isError, error, refetch } = useSubscription();

  function handleRetry() {
    void refetch();
  }

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
        <Skeleton className="h-4 w-32 shrink-0" />
        <div className="min-h-0 flex-1 divide-y divide-border overflow-hidden rounded-xl border border-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4 px-4 py-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load payment history"
        description={getErrorMessage(error)}
        onRetry={handleRetry}
        className="h-full min-h-0 flex-1"
      />
    );
  }

  const payments = (data?.subscription?.payments ?? []).map((p) => ({
    ...p,
    currency: p.currency ?? "INR",
  }));

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <DataTable
        data={payments}
        columns={PAYMENT_COLUMNS}
        getRowKey={getPaymentRowKey}
        emptyState={EMPTY_STATE}
        className="h-full min-h-0 flex-1"
      />
    </div>
  );
}
