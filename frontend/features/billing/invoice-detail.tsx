"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/error-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  useInvoice,
  useUpdateInvoice,
  useVoidInvoice,
} from "@/hooks/api/invoice";
import { getErrorMessage } from "@/lib/get-error-message";
import type { PatchableInvoiceStatus } from "@/types/invoice";
import { InvoiceDetailActions } from "./invoice-detail-actions";
import { InvoiceDetailContent } from "./invoice-detail-content";
import { downloadInvoicePdf } from "./invoice-detail-pdf";
import { InvoiceDetailSkeleton } from "./invoice-detail-skeleton";
import { invoiceStatusBadge } from "./invoice-detail-utils";
import { RecordPaymentDialog } from "./record-payment-dialog";

interface InvoiceDetailProps {
  invoiceId: number;
}

export function InvoiceDetail({ invoiceId }: InvoiceDetailProps) {
  const { data: invoice, isLoading, error, refetch } = useInvoice(invoiceId);
  const updateInvoice = useUpdateInvoice();
  const voidInvoice = useVoidInvoice();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const handleStatusUpdate = useCallback(
    (status: PatchableInvoiceStatus) => {
      updateInvoice.mutate(
        { id: invoiceId, status },
        {
          onSuccess: () =>
            toast.success(`Invoice marked as ${status.toLowerCase()}`),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [invoiceId, updateInvoice],
  );

  const handleVoid = useCallback(() => {
    voidInvoice.mutate(invoiceId, {
      onSuccess: () =>
        toast.success("Invoice voided and its journal entry reversed"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [invoiceId, voidInvoice]);

  const handleDownload = useCallback(() => {
    if (!invoice) return;
    void downloadInvoicePdf(invoice)
      .then(() => toast.success("Invoice PDF downloaded"))
      .catch((error: unknown) => toast.error(getErrorMessage(error)));
  }, [invoice]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) return <InvoiceDetailSkeleton />;

  if (error || !invoice) {
    return (
      <PageWrapper title="Invoice" backHref="/billing/invoices">
        <ErrorState
          title={error ? "Failed to load invoice" : "Invoice not found"}
          description={
            error
              ? getErrorMessage(error)
              : "The invoice you are looking for does not exist."
          }
          onRetry={error ? handleRetry : undefined}
        />
      </PageWrapper>
    );
  }

  const badge = invoiceStatusBadge[invoice.status];
  const totalPaid =
    invoice.payments?.reduce(
      (total, payment) => total + Number(payment.amount),
      0,
    ) ?? 0;
  const outstanding = Number(invoice.total) - totalPaid;

  return (
    <PageWrapper
      title={invoice.invoiceNumber}
      subtitle={invoice.client?.name ?? "No client"}
      badge={
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-dense font-medium ${badge.className}`}
        >
          {badge.label}
        </span>
      }
      backHref="/billing/invoices"
      actions={
        <InvoiceDetailActions
          invoice={invoice}
          outstanding={outstanding}
          isUpdating={updateInvoice.isPending || voidInvoice.isPending}
          onEdit={() => setEditOpen(true)}
          onRecordPayment={() => setPaymentOpen(true)}
          onStatusUpdate={handleStatusUpdate}
          onVoid={handleVoid}
          onDownload={handleDownload}
        />
      }
    >
      <InvoiceDetailContent
        invoice={invoice}
        totalPaid={totalPaid}
        outstanding={outstanding}
        editOpen={editOpen}
        onEditOpenChange={setEditOpen}
        onRecordPayment={() => setPaymentOpen(true)}
      />
      <RecordPaymentDialog
        open={paymentOpen}
        invoiceId={invoiceId}
        outstanding={outstanding}
        onOpenChange={setPaymentOpen}
      />
    </PageWrapper>
  );
}
