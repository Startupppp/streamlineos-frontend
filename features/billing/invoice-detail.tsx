"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Download, Send, Check, Ban, Plus, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { toast } from "sonner";
import { useInvoice, useUpdateInvoice } from "@/lib/api/hooks/invoice";
import type { InvoiceStatus } from "@/types/invoice";
import { InvoiceLineItems } from "./invoice-line-items";
import { RecordPaymentDialog } from "./record-payment-dialog";

const STATUS_BADGE: Record<
  InvoiceStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  SENT: { label: "Sent", variant: "default" },
  PAID: { label: "Paid", variant: "outline" },
  OVERDUE: { label: "Overdue", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "secondary" },
};

function fmt(amount: string | number) {
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

interface InvoiceDetailProps {
  invoiceId: number;
}

export function InvoiceDetail({ invoiceId }: InvoiceDetailProps) {
  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const updateInvoice = useUpdateInvoice();

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <PageWrapper title="Invoice">
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageWrapper>
    );
  }

  if (!invoice) {
    return (
      <PageWrapper title="Invoice">
        <p className="text-muted-foreground py-8 text-center">Invoice not found.</p>
      </PageWrapper>
    );
  }

  const badge = STATUS_BADGE[invoice.status];
  const totalPaid = (invoice.payments ?? []).reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  );
  const outstanding = Number(invoice.total) - totalPaid;

  function handleStatusUpdate(status: InvoiceStatus) {
    updateInvoice.mutate(
      { id: invoiceId, status },
      {
        onSuccess: () => toast.success(`Invoice marked as ${status.toLowerCase()}`),
        onError: () => toast.error("Failed to update status"),
      },
    );
  }

  async function handleDownloadPdf() {
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text("INVOICE", 20, 25);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("StreamlineOS — Capital Advisors LLP", 20, 33);
      doc.text(`Invoice #: ${invoice!.invoiceNumber}`, 20, 40);
      doc.text(`Date: ${format(new Date(invoice!.createdAt), "dd MMM yyyy")}`, 20, 47);
      if (invoice!.dueDate) {
        doc.text(`Due: ${format(new Date(invoice!.dueDate), "dd MMM yyyy")}`, 20, 54);
      }
      doc.setDrawColor(189, 136, 44);
      doc.line(20, 60, 190, 60);
      if (invoice!.client) {
        doc.setTextColor(0);
        doc.setFontSize(12);
        doc.text(`Bill To: ${invoice!.client.name}`, 20, 70);
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
      for (const item of invoice!.lineItems) {
        doc.text(item.description, 20, y);
        doc.text(String(item.quantity), 110, y);
        doc.text(fmt(item.rate), 135, y);
        doc.text(fmt(item.amount), 165, y);
        y += 8;
      }
      doc.line(20, y + 2, 190, y + 2);
      y += 10;
      doc.text(`Subtotal: ${fmt(invoice!.subtotal)}`, 130, y);
      y += 7;
      if (Number(invoice!.taxRate)) {
        doc.text(`Tax (${invoice!.taxRate}%): ${fmt(invoice!.taxAmount ?? 0)}`, 130, y);
        y += 7;
      }
      doc.setFontSize(13);
      doc.text(`Total: ${fmt(invoice!.total)}`, 130, y);
      if (invoice!.notes) {
        y += 15;
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Notes: ${invoice!.notes}`, 20, y);
      }
      doc.save(`${invoice!.invoiceNumber}.pdf`);
      toast.success("Invoice PDF downloaded");
    } catch {
      toast.error("Failed to generate PDF");
    }
  }

  return (
    <PageWrapper
      title={invoice.invoiceNumber}
      subtitle={invoice.client?.name ?? "No client"}
      badge={<Badge variant={badge.variant}>{badge.label}</Badge>}
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          {invoice.status === "DRAFT" && (
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
          )}
          {invoice.status === "DRAFT" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusUpdate("SENT")}
              disabled={updateInvoice.isPending}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" /> Mark Sent
            </Button>
          )}
          {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
            <Button size="sm" variant="outline" onClick={() => setPaymentOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Record Payment
            </Button>
          )}
          {invoice.status !== "CANCELLED" && invoice.status !== "PAID" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusUpdate("CANCELLED")}
              disabled={updateInvoice.isPending}
            >
              <Ban className="h-3.5 w-3.5 mr-1.5" /> Cancel
            </Button>
          )}
          {invoice.status === "PAID" && outstanding <= 0 && (
            <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <Check className="h-4 w-4" /> Fully Paid
            </div>
          )}
          <Button size="sm" variant="outline" onClick={handleDownloadPdf}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Download PDF
          </Button>
          <Link href="/billing/invoices">
            <Button size="sm" variant="ghost">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6 max-w-3xl">
        <div className="rounded-lg border border-border bg-card p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Invoice #</p>
            <p className="font-mono font-medium">{invoice.invoiceNumber}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Created</p>
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

        {invoice.notes && (
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Notes</p>
            <p className="text-sm text-muted-foreground">{invoice.notes}</p>
          </div>
        )}

        {(invoice.payments ?? []).length > 0 && (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold">Payment History</p>
              {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
                <Button size="sm" variant="outline" onClick={() => setPaymentOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Payment
                </Button>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoice.payments ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">
                      {format(new Date(p.paymentDate), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-sm capitalize">
                      {p.paymentMethod.replace("_", " ")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">
                      {p.referenceNumber ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-emerald-600">
                      {fmt(p.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
