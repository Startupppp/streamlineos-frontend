"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  Download,
  Send,
  Check,
  Ban,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { toast } from "sonner";
import {
  useInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
} from "@/hooks/api/invoice";
import { getErrorMessage } from "@/lib/get-error-message";
import type { InvoiceStatus } from "@/types/invoice";
import { InvoiceLineItems } from "./invoice-line-items";
import { RecordPaymentDialog } from "./record-payment-dialog";

const STATUS_BADGE: Record<
  InvoiceStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Draft",
    className: "bg-muted text-muted-foreground border-border",
  },
  ISSUED: {
    label: "Issued",
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  },
  PAID: {
    label: "Paid",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  FAILED: {
    label: "Failed",
    className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  },
  VOIDED: {
    label: "Voided",
    className: "bg-muted text-muted-foreground border-border",
  },
};

function fmt(amount: string | number) {
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type Payment = {
  id: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string | null;
  creator?: { name?: string | null } | null;
  amount: string | number;
};

const paymentColumns: DataTableColumn<Payment>[] = [
  {
    key: "paymentDate",
    header: "Date",
    className: "text-sm",
    cell: (p) => format(new Date(p.paymentDate), "dd MMM yyyy"),
  },
  {
    key: "paymentMethod",
    header: "Method",
    className: "text-sm capitalize",
    cell: (p) => p.paymentMethod.replace("_", " "),
  },
  {
    key: "referenceNumber",
    header: "Reference",
    className: "text-sm text-muted-foreground font-mono",
    cell: (p) => p.referenceNumber ?? "—",
  },
  {
    key: "creator",
    header: "Recorded by",
    className: "text-sm text-muted-foreground",
    cell: (p) => p.creator?.name ?? "—",
  },
  {
    key: "amount",
    header: "Amount",
    headerClassName: "text-right",
    className: "text-right font-mono text-sm font-medium text-emerald-600 dark:text-emerald-400",
    cell: (p) => fmt(p.amount),
  },
];

function getPaymentKey(p: Payment) {
  return p.id;
}

function InvoiceDetailSkeleton() {
  return (
    <PageWrapper
      title="Invoice"
      badge={<Skeleton className="h-4 w-14" />}
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      }
    >
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
          <div className="col-span-2 space-y-1.5">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="px-4 pt-3 pb-1 grid grid-cols-12 gap-3">
            <Skeleton className="col-span-6 h-3" />
            <Skeleton className="col-span-2 h-3" />
            <Skeleton className="col-span-2 h-3" />
            <Skeleton className="col-span-2 h-3" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="px-4 py-3 grid grid-cols-12 gap-3 items-center"
              >
                <Skeleton className="col-span-6 h-4" />
                <Skeleton className="col-span-2 h-4" />
                <Skeleton className="col-span-2 h-4" />
                <Skeleton className="col-span-2 h-4" />
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-border space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card px-4 py-3 space-y-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </PageWrapper>
  );
}

interface InvoiceDetailProps {
  invoiceId: number;
}

export function InvoiceDetail({ invoiceId }: InvoiceDetailProps) {
  const router = useRouter();
  const { data: invoice, isLoading, error, refetch } = useInvoice(invoiceId);
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  function handleRetry() {
    void refetch();
  }

  const handleStatusUpdate = useCallback(
    (status: InvoiceStatus) => {
      updateInvoice.mutate(
        { id: invoiceId, status },
        {
          onSuccess: () =>
            toast.success(`Invoice marked as ${status.toLowerCase()}`),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [invoiceId, updateInvoice],
  );

  const handleMarkIssued = useCallback(
    () => handleStatusUpdate("ISSUED"),
    [handleStatusUpdate],
  );
  const handleMarkPaid = useCallback(
    () => handleStatusUpdate("PAID"),
    [handleStatusUpdate],
  );
  const handleVoid = useCallback(
    () => handleStatusUpdate("VOIDED"),
    [handleStatusUpdate],
  );

  const handleOpenPayment = useCallback(() => setPaymentOpen(true), []);
  const handleOpenEdit = useCallback(() => setEditOpen(true), []);

  const handleDelete = useCallback(() => {
    deleteInvoice.mutate(invoiceId, {
      onSuccess: () => {
        toast.success("Invoice deleted");
        router.push("/billing/invoices");
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [invoiceId, deleteInvoice, router]);

  const handleDownloadPdf = useCallback(async () => {
    if (!invoice) return;
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text("INVOICE", 20, 25);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("StreamlineOS — Capital Advisors LLP", 20, 33);
      doc.text(`Invoice #: ${invoice.invoiceNumber}`, 20, 40);
      doc.text(
        `Date: ${format(new Date(invoice.createdAt), "dd MMM yyyy")}`,
        20,
        47,
      );
      if (invoice.dueDate) {
        doc.text(
          `Due: ${format(new Date(invoice.dueDate), "dd MMM yyyy")}`,
          20,
          54,
        );
      }
      doc.setDrawColor(189, 136, 44);
      doc.line(20, 60, 190, 60);
      if (invoice.client) {
        doc.setTextColor(0);
        doc.setFontSize(12);
        doc.text(`Bill To: ${invoice.client.name}`, 20, 70);
      }
      doc.setFontSize(10);
      doc.setTextColor(100);
      let y = 85;
      doc.text("Description", 20, y);
      doc.text("Qty", 110, y);
      doc.text("Rate", 135, y);
      doc.text("Amount", 165, y);
      doc.line(20, y + 3, 190, y + 3);
      y += 10;
      doc.setTextColor(0);
      for (const item of invoice.lineItems) {
        doc.text(item.description, 20, y);
        doc.text(String(item.quantity), 110, y);
        doc.text(fmt(item.rate), 135, y);
        doc.text(fmt(item.amount), 165, y);
        y += 8;
      }
      doc.line(20, y + 2, 190, y + 2);
      y += 10;
      doc.text(`Subtotal: ${fmt(invoice.subtotal)}`, 130, y);
      y += 7;
      if (Number(invoice.taxRate)) {
        doc.text(
          `Tax (${invoice.taxRate}%): ${fmt(invoice.taxAmount ?? 0)}`,
          130,
          y,
        );
        y += 7;
      }
      doc.setFontSize(13);
      doc.text(`Total: ${fmt(invoice.total)}`, 130, y);
      if (invoice.notes) {
        y += 15;
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Notes: ${invoice.notes}`, 20, y);
      }
      doc.save(`${invoice.invoiceNumber}.pdf`);
      toast.success("Invoice PDF downloaded");
    } catch {
      toast.error("Failed to generate PDF");
    }
  }, [invoice]);

  if (isLoading) {
    return <InvoiceDetailSkeleton />;
  }

  if (error || !invoice) {
    return (
      <PageWrapper title="Invoice">
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

  const badge = STATUS_BADGE[invoice.status];
  const totalPaid = (invoice.payments ?? []).reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  );
  const outstanding = Number(invoice.total) - totalPaid;

  return (
    <PageWrapper
      title={invoice.invoiceNumber}
      subtitle={invoice.client?.name ?? "No client"}
      badge={
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${badge.className}`}
        >
          {badge.label}
        </span>
      }
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          {invoice.status === "DRAFT" && (
            <Button size="sm" variant="outline" onClick={handleOpenEdit}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
          )}
          {invoice.status === "DRAFT" && (
            <LoadingButton
              size="sm"
              variant="outline"
              onClick={handleMarkIssued}
              isPending={updateInvoice.isPending}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" /> Mark Issued
            </LoadingButton>
          )}
          {(invoice.status === "ISSUED" || invoice.status === "FAILED") && (
            <Button size="sm" variant="outline" onClick={handleOpenPayment}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Record Payment
            </Button>
          )}
          {invoice.status === "ISSUED" && (
            <LoadingButton
              size="sm"
              variant="outline"
              onClick={handleMarkPaid}
              isPending={updateInvoice.isPending}
            >
              <Check className="h-3.5 w-3.5 mr-1.5" /> Mark Paid
            </LoadingButton>
          )}
          {invoice.status !== "VOIDED" && invoice.status !== "PAID" && (
            <LoadingButton
              size="sm"
              variant="outline"
              onClick={handleVoid}
              isPending={updateInvoice.isPending}
            >
              <Ban className="h-3.5 w-3.5 mr-1.5" /> Void
            </LoadingButton>
          )}
          {invoice.status === "PAID" && outstanding <= 0 && (
            <div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              <Check className="h-4 w-4" /> Fully Paid
            </div>
          )}
          <Button size="sm" variant="outline" onClick={handleDownloadPdf}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Download PDF
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <LoadingButton
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
                isPending={deleteInvoice.isPending}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete
              </LoadingButton>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete invoice{" "}
                  <span className="font-mono font-medium">
                    {invoice.invoiceNumber}
                  </span>
                  . This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete Invoice
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Link href="/billing/invoices">
            <Button size="sm" variant="ghost">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Invoice #</p>
            <p className="font-mono font-medium">{invoice.invoiceNumber}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Issued</p>
            <p>{format(new Date(invoice.createdAt), "dd MMM yyyy")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Due Date</p>
            <p>
              {invoice.dueDate
                ? format(new Date(invoice.dueDate), "dd MMM yyyy")
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Currency</p>
            <p>{invoice.currency}</p>
          </div>
          {invoice.client && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground mb-0.5">Client</p>
              <p className="font-medium">{invoice.client.name}</p>
            </div>
          )}
          {invoice.project && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground mb-0.5">Project</p>
              <p>{invoice.project.name}</p>
            </div>
          )}
          {invoice.creator && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground mb-0.5">Created by</p>
              <p>{invoice.creator.name ?? invoice.creator.id}</p>
            </div>
          )}
        </div>

        <InvoiceLineItems
          invoiceId={invoiceId}
          lineItems={invoice.lineItems}
          subtotal={invoice.subtotal}
          taxRate={invoice.taxRate}
          taxAmount={invoice.taxAmount}
          discount={invoice.discount}
          total={invoice.total}
          totalPaid={totalPaid}
          outstanding={outstanding}
          dueDate={invoice.dueDate}
          notes={invoice.notes}
          currency={invoice.currency}
          editOpen={editOpen}
          onEditOpenChange={setEditOpen}
        />

        {(invoice.payments ?? []).length > 0 && (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold">Payment History</p>
              {(invoice.status === "ISSUED" || invoice.status === "FAILED") && (
                <Button size="sm" variant="outline" onClick={handleOpenPayment}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Payment
                </Button>
              )}
            </div>
            <DataTable
              data={invoice.payments ?? []}
              columns={paymentColumns}
              getRowKey={getPaymentKey}
              className="border-0 rounded-none"
            />
          </div>
        )}

        {invoice.status === "PAID" && (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold">Credit Notes</p>
            </div>
            <div className="px-4 py-4 space-y-1">
              <p className="text-sm text-muted-foreground">
                No credit notes issued for this invoice.
              </p>
              <p className="text-xs text-muted-foreground">
                To issue a credit note, contact billing support.
              </p>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">Refund History</p>
          </div>
          <div className="px-4 py-4">
            <p className="text-sm text-muted-foreground">No refunds processed.</p>
          </div>
        </div>

        {invoice.notes && (
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground mb-1">
              Notes
            </p>
            <p className="text-sm text-muted-foreground">{invoice.notes}</p>
          </div>
        )}

        {invoice.terms && (
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground mb-1">
              Terms
            </p>
            <p className="text-sm text-muted-foreground">{invoice.terms}</p>
          </div>
        )}
      </div>

      <RecordPaymentDialog
        open={paymentOpen}
        invoiceId={invoiceId}
        outstanding={outstanding}
        onOpenChange={setPaymentOpen}
      />
    </PageWrapper>
  );
}
