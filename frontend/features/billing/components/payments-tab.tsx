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
  currency: string;
  paidAt: string | null;
  status: string;
}

function fmtAmount(amount: string | number | null, currency: string): string {
  if (amount === null) return "—";
  const symbol = currency === "INR" ? "₹" : currency;
  return `${symbol}${Number(amount).toLocaleString("en-IN")}`;
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
    cell: (row): ReactNode => fmtAmount(row.amount, row.currency),
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
    className="border-0 bg-transparent py-10"
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
      <div className="flex flex-1 min-h-0 flex-col gap-3">
        <Skeleton className="h-4 w-32" />
        <div className="divide-y divide-border rounded-xl border border-border">
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
        className="flex-1"
      />
    );
  }

  const payments = (data?.subscription?.payments ?? []).map((p) => ({
    ...p,
    currency: p.currency ?? "INR",
  }));

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Subscription Payments</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Razorpay payment history for your subscription
        </p>
      </div>
      <DataTable
        data={payments}
        columns={PAYMENT_COLUMNS}
        getRowKey={getPaymentRowKey}
        emptyState={EMPTY_STATE}
        className="flex-1 min-h-0"
      />
    </div>
  );
}
