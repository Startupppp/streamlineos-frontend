"use client";

import type { MouseEvent, ReactNode } from "react";
import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useSubscription, fetchPaymentReceipt } from "@/hooks/api/subscription";
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
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  function handleRetry() {
    void refetch();
  }

  async function handleDownloadReceipt(paymentId: number) {
    setDownloadingId(paymentId);
    try {
      const receipt = await fetchPaymentReceipt(paymentId);
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const amountValue =
        receipt.amount !== null ? Number(receipt.amount) : receipt.amountPaise / 100;
      const formattedDate = receipt.paidAt
        ? new Date(receipt.paidAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : new Date(receipt.createdAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });

      doc.setFontSize(20);
      doc.text("Payment Receipt", 20, 25);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("StreamlineOS", 20, 35);
      doc.setDrawColor(0);
      doc.line(20, 40, 190, 40);
      doc.setTextColor(0);
      doc.setFontSize(11);
      doc.text("Receipt for Payment", 20, 52);
      doc.setFontSize(10);
      doc.setTextColor(80);
      if (receipt.razorpayPaymentId) {
        doc.text(`Payment ID: ${receipt.razorpayPaymentId}`, 20, 62);
      }
      if (receipt.razorpayOrderId) {
        doc.text(`Order ID: ${receipt.razorpayOrderId}`, 20, 70);
      }
      doc.text(`Date: ${formattedDate}`, 20, 78);
      doc.text(`Status: ${receipt.status}`, 20, 86);
      doc.setDrawColor(200);
      doc.line(20, 94, 190, 94);
      doc.setTextColor(0);
      doc.setFontSize(13);
      doc.text(
        `Amount Paid: ${receipt.currency} ${amountValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
        20,
        106,
      );

      const filename = receipt.razorpayPaymentId
        ? `receipt-${receipt.razorpayPaymentId}.pdf`
        : `receipt-${receipt.id}.pdf`;
      doc.save(filename);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloadingId(null);
    }
  }

  function handleReceiptClick(event: MouseEvent<HTMLButtonElement>) {
    void handleDownloadReceipt(Number(event.currentTarget.dataset.paymentId));
  }

  const columns: DataTableColumn<Payment>[] = [
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
    {
      key: "receipt",
      header: "Receipt",
      cell: (row): ReactNode => {
        if (row.status !== "captured") return null;
        return (
          <LoadingButton
            type="button"
            variant="ghost"
            size="sm"
            isPending={downloadingId === row.id}
            aria-label={`Download receipt for payment ${row.razorpayPaymentId ?? row.id}`}
            data-payment-id={row.id}
            onClick={handleReceiptClick}
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Receipt
          </LoadingButton>
        );
      },
    },
  ];

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
        columns={columns}
        getRowKey={getPaymentRowKey}
        emptyState={EMPTY_STATE}
        className="h-full min-h-0 flex-1"
      />
    </div>
  );
}
