"use client";

import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useCan } from "@/hooks/api/access";
import type { Invoice, Payment } from "@/types/invoice";
import { InvoiceLineItems } from "./invoice-line-items";
import { formatInvoiceAmount } from "./invoice-detail-utils";

const paymentColumns: DataTableColumn<Payment>[] = [
  { key: "paymentDate", header: "Date", className: "text-sm", cell: (payment) => format(new Date(payment.paymentDate), "dd MMM yyyy") },
  { key: "paymentMethod", header: "Method", className: "text-sm capitalize", cell: (payment) => payment.paymentMethod.replace("_", " ") },
  { key: "referenceNumber", header: "Reference", className: "text-sm font-mono text-muted-foreground", cell: (payment) => payment.referenceNumber ?? "—" },
  { key: "creator", header: "Recorded by", className: "text-sm text-muted-foreground", cell: (payment) => payment.creator?.name ?? "—" },
  { key: "amount", header: "Amount", headerClassName: "text-right", className: "text-right font-mono text-sm font-medium text-status-success-ink", cell: (payment) => formatInvoiceAmount(payment.amount) },
];

interface InvoiceDetailContentProps {
  invoice: Invoice;
  totalPaid: number;
  outstanding: number;
  editOpen: boolean;
  onEditOpenChange: (open: boolean) => void;
  onRecordPayment: () => void;
}

function InvoiceMetadata({ invoice }: { invoice: Invoice }) {
  return (
    <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-5 text-sm sm:grid-cols-4">
      <Detail label="Invoice #" value={<span className="font-mono font-medium">{invoice.invoiceNumber}</span>} />
      <Detail label="Issued" value={format(new Date(invoice.createdAt), "dd MMM yyyy")} />
      <Detail label="Due Date" value={invoice.dueDate ? format(new Date(invoice.dueDate), "dd MMM yyyy") : "—"} />
      <Detail label="Currency" value={invoice.currency} />
      {invoice.client && <Detail className="col-span-2" label="Client" value={<TruncatedText text={invoice.client.name} className="font-medium" />} />}
      {invoice.project && <Detail className="col-span-2" label="Project" value={<TruncatedText text={invoice.project.name} className="text-sm" />} />}
      {invoice.creator && <Detail className="col-span-2" label="Created by" value={<TruncatedText text={String(invoice.creator.name ?? invoice.creator.id)} className="text-sm" />} />}
    </div>
  );
}

interface DetailProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

function Detail({ label, value, className }: DetailProps) {
  return <div className={className}><p className="mb-0.5 text-xs text-muted-foreground">{label}</p><div>{value}</div></div>;
}

function InvoicePayments({ invoice, onRecordPayment }: Pick<InvoiceDetailContentProps, "invoice" | "onRecordPayment">) {
  // POST /invoices/:invoiceId/payments declares accounting:create.
  const canCreatePayment = useCan("accounting:create");
  if (!invoice.payments?.length) return null;
  const canRecordPayment =
    canCreatePayment && (invoice.status === "ISSUED" || invoice.status === "FAILED");
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-semibold">Payment History</p>
        {canRecordPayment && <Button size="sm" variant="outline" onClick={onRecordPayment}><Plus className="mr-1 h-3.5 w-3.5" /> Add Payment</Button>}
      </div>
      <DataTable data={invoice.payments} columns={paymentColumns} getRowKey={(payment) => payment.id} className="rounded-none border-0" />
    </div>
  );
}

function StaticHistory({ invoice }: Pick<InvoiceDetailContentProps, "invoice">) {
  return (
    <>
      {invoice.status === "PAID" && <section className="overflow-hidden rounded-lg border border-border bg-card"><div className="border-b border-border px-4 py-3"><p className="text-sm font-semibold">Credit Notes</p></div><div className="space-y-1 px-4 py-4"><p className="text-sm text-muted-foreground">No credit notes issued for this invoice.</p><p className="text-xs text-muted-foreground">To issue a credit note, contact billing support.</p></div></section>}
      <section className="overflow-hidden rounded-lg border border-border bg-card"><div className="border-b border-border px-4 py-3"><p className="text-sm font-semibold">Refund History</p></div><div className="px-4 py-4"><p className="text-sm text-muted-foreground">No refunds processed.</p></div></section>
    </>
  );
}

export function InvoiceDetailContent({ invoice, totalPaid, outstanding, editOpen, onEditOpenChange, onRecordPayment }: InvoiceDetailContentProps) {
  return (
    <div className="space-y-6">
      <InvoiceMetadata invoice={invoice} />
      <InvoiceLineItems invoiceId={invoice.id} lineItems={invoice.lineItems} subtotal={invoice.subtotal} taxRate={invoice.taxRate} taxAmount={invoice.taxAmount} discount={invoice.discount} total={invoice.total} totalPaid={totalPaid} outstanding={outstanding} dueDate={invoice.dueDate} notes={invoice.notes} currency={invoice.currency} editOpen={editOpen} onEditOpenChange={onEditOpenChange} />
      <InvoicePayments invoice={invoice} onRecordPayment={onRecordPayment} />
      <StaticHistory invoice={invoice} />
      {invoice.notes && <section className="rounded-lg border border-border bg-card px-4 py-3"><p className="mb-1 text-xs font-semibold text-muted-foreground">Notes</p><p className="text-sm text-muted-foreground">{invoice.notes}</p></section>}
      {invoice.terms && <section className="rounded-lg border border-border bg-card px-4 py-3"><p className="mb-1 text-xs font-semibold text-muted-foreground">Terms</p><p className="text-sm text-muted-foreground">{invoice.terms}</p></section>}
    </div>
  );
}
