"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { FinanceStatusBadge, Money } from "@/features/accounting/shared";
import { RecordPaymentDialog } from "@/features/accounting/sales/record-payment-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { useInvoice } from "@/hooks/api/invoice";
import { useCreditNotes } from "@/hooks/api/accounting/ar";
import type { FinanceStatus } from "@/features/accounting/shared";
import type { Invoice, Payment } from "@/types/invoice";
import type { CreditNote } from "@/types/accounting/ar";
import { useState } from "react";

const STATUS_MAP: Record<string, FinanceStatus> = {
  DRAFT: "DRAFT",
  ISSUED: "SENT",
  SENT: "SENT",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  PAID: "PAID",
  OVERDUE: "OVERDUE",
  FAILED: "OVERDUE",
  VOIDED: "VOID",
  POSTED: "POSTED",
  VOID: "VOID",
  APPLIED: "PAID",
};

function toFinanceStatus(status: string): FinanceStatus {
  return STATUS_MAP[status] ?? "DRAFT";
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

function InvoiceDetailSkeleton() {
  return (
    <PageWrapper title="Invoice" backHref="/accounting/invoices">
      <div className="space-y-4 max-w-4xl">
        <div className="rounded-xl border border-border bg-card p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

interface PaymentsTableProps {
  payments: Payment[];
}

function PaymentsTable({ payments }: PaymentsTableProps) {
  if (payments.length === 0) {
    return (
      <EmptyState
        illustrationPreset="expenses"
        title="No payments recorded"
        compact
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="text-xs uppercase font-semibold tracking-wider text-muted-foreground px-3 py-2">
              Date
            </TableHead>
            <TableHead className="text-xs uppercase font-semibold tracking-wider text-muted-foreground px-3 py-2">
              Method
            </TableHead>
            <TableHead className="text-xs uppercase font-semibold tracking-wider text-muted-foreground px-3 py-2">
              Reference
            </TableHead>
            <TableHead className="text-xs uppercase font-semibold tracking-wider text-muted-foreground px-3 py-2 text-right">
              Amount
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p) => (
            <TableRow key={p.id} className="border-b border-border/50">
              <TableCell className="text-xs tabular-nums px-3 py-2">
                {formatDate(p.paymentDate)}
              </TableCell>
              <TableCell className="text-xs px-3 py-2 capitalize">
                {p.paymentMethod.replace(/_/g, " ")}
              </TableCell>
              <TableCell className="text-xs font-mono px-3 py-2 text-muted-foreground">
                {p.referenceNumber ?? "—"}
              </TableCell>
              <TableCell className="text-xs text-right tabular-nums px-3 py-2">
                <Money value={Number(p.amount)} compact />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface LinkedCreditNotesProps {
  clientId: number | null;
  invoiceId: number;
}

function LinkedCreditNotes({ clientId, invoiceId }: LinkedCreditNotesProps) {
  const creditNotesQuery = useCreditNotes(
    clientId !== null ? { clientId } : {},
  );

  const linked = (creditNotesQuery.data?.items ?? []).filter(
    (cn) => cn.invoiceId === invoiceId,
  );

  if (creditNotesQuery.isLoading) {
    return <Skeleton className="h-8 w-full" />;
  }

  if (linked.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-3 px-1">
        No credit notes linked to this invoice.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="text-xs uppercase font-semibold tracking-wider text-muted-foreground px-3 py-2">
              #
            </TableHead>
            <TableHead className="text-xs uppercase font-semibold tracking-wider text-muted-foreground px-3 py-2">
              Status
            </TableHead>
            <TableHead className="text-xs uppercase font-semibold tracking-wider text-muted-foreground px-3 py-2 text-right">
              Total
            </TableHead>
            <TableHead className="text-xs uppercase font-semibold tracking-wider text-muted-foreground px-3 py-2 text-right">
              Applied
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linked.map((cn: CreditNote) => (
            <TableRow key={cn.id} className="border-b border-border/50">
              <TableCell className="text-xs font-mono px-3 py-2">
                {cn.creditNoteNumber}
              </TableCell>
              <TableCell className="px-3 py-2">
                {cn.status === "APPLIED" ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] h-4 px-1.5">
                    Applied
                  </Badge>
                ) : (
                  <FinanceStatusBadge status={toFinanceStatus(cn.status)} />
                )}
              </TableCell>
              <TableCell className="text-xs text-right tabular-nums px-3 py-2">
                <Money value={Number(cn.total)} compact />
              </TableCell>
              <TableCell className="text-xs text-right tabular-nums px-3 py-2">
                <Money value={Number(cn.appliedAmount)} compact />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface CollectionPanelProps {
  invoice: Invoice;
}

function CollectionPanel({ invoice }: CollectionPanelProps) {
  const balance = Math.max(
    0,
    Number(invoice.total) - Number(invoice.amountPaid ?? "0"),
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
      <div>
        <p className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px] mb-0.5">
          Balance Due
        </p>
        <p className="font-semibold text-sm tabular-nums">
          <Money value={balance} currency={invoice.currency} compact />
        </p>
      </div>
      <div>
        <p className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px] mb-0.5">
          Collection Owner
        </p>
        <p className="text-foreground">
          {invoice.collectionOwnerId ?? <span className="text-muted-foreground">Unassigned</span>}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px] mb-0.5">
          Promise to Pay
        </p>
        <p className="text-foreground">
          {invoice.promiseToPayDate
            ? formatDate(invoice.promiseToPayDate)
            : <span className="text-muted-foreground">Not set</span>}
        </p>
      </div>
    </div>
  );
}

interface InvoiceDetailContentProps {
  invoiceId: number;
}

function InvoiceDetailContent({ invoiceId }: InvoiceDetailContentProps) {
  const router = useRouter();
  const { data: invoice, isLoading, error, refetch } = useInvoice(invoiceId);
  const [paymentOpen, setPaymentOpen] = useState(false);

  function handleBack(): void {
    router.push("/accounting/invoices");
  }

  function handleRetry(): void {
    void refetch();
  }

  function handleOpenPayment(): void {
    setPaymentOpen(true);
  }

  function handleClosePayment(): void {
    setPaymentOpen(false);
  }

  if (isLoading) {
    return <InvoiceDetailSkeleton />;
  }

  if (error || !invoice) {
    return (
      <PageWrapper title="Invoice" backHref="/accounting/invoices">
        <ErrorState
          title="Failed to load invoice"
          description={error ? getErrorMessage(error) : "Invoice not found."}
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  const amountPaid = Number(invoice.amountPaid ?? "0");
  const balance = Math.max(0, Number(invoice.total) - amountPaid);
  const payments = invoice.payments ?? [];

  return (
    <PageWrapper
      eyebrow="Accounting · Invoices"
      title={invoice.invoiceNumber}
      backHref="/accounting/invoices"
      badge={<FinanceStatusBadge status={toFinanceStatus(invoice.status)} />}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft className="size-3.5 mr-1" />
            Back
          </Button>
          {balance > 0 && invoice.status !== "VOIDED" && (
            <Button size="sm" onClick={handleOpenPayment}>
              Record Payment
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4 max-w-4xl">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-0.5">
                Customer
              </p>
              <p className="text-sm font-medium">{invoice.client?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-0.5">
                Invoice Date
              </p>
              <p className="text-sm tabular-nums">{formatDate(invoice.createdAt)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-0.5">
                Due Date
              </p>
              <p className="text-sm tabular-nums">{formatDate(invoice.dueDate)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-0.5">
                Total
              </p>
              <p className="text-sm font-semibold tabular-nums">
                <Money value={Number(invoice.total)} currency={invoice.currency} compact />
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-0.5">
                Amount Paid
              </p>
              <p className="text-sm tabular-nums text-emerald-600 font-medium">
                <Money value={amountPaid} currency={invoice.currency} compact />
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-0.5">
                Balance Due
              </p>
              <p className="text-sm font-semibold tabular-nums text-red-600">
                <Money value={balance} currency={invoice.currency} compact />
              </p>
            </div>
            {invoice.project && (
              <div>
                <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-0.5">
                  Project
                </p>
                <p className="text-sm">{invoice.project.name}</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold">Line Items</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs uppercase font-semibold tracking-wider text-muted-foreground px-3 py-2">
                    Description
                  </TableHead>
                  <TableHead className="text-xs uppercase font-semibold tracking-wider text-muted-foreground px-3 py-2 text-right w-20">
                    Qty
                  </TableHead>
                  <TableHead className="text-xs uppercase font-semibold tracking-wider text-muted-foreground px-3 py-2 text-right w-28">
                    Rate
                  </TableHead>
                  <TableHead className="text-xs uppercase font-semibold tracking-wider text-muted-foreground px-3 py-2 text-right w-28">
                    Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.lineItems.map((item, i) => (
                  <TableRow key={i} className="border-b border-border/50">
                    <TableCell className="text-xs px-3 py-2">
                      {item.description}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums px-3 py-2">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums px-3 py-2">
                      <Money value={item.rate} currency={invoice.currency} compact />
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums px-3 py-2 font-medium">
                      <Money value={item.amount} currency={invoice.currency} compact />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="px-4 py-3 border-t border-border space-y-1.5 flex flex-col items-end">
            <div className="flex items-center gap-8 text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums font-medium text-foreground w-24 text-right">
                <Money value={Number(invoice.subtotal)} currency={invoice.currency} compact />
              </span>
            </div>
            {invoice.taxAmount && Number(invoice.taxAmount) > 0 && (
              <div className="flex items-center gap-8 text-xs text-muted-foreground">
                <span>Tax ({invoice.taxRate ?? 0}%)</span>
                <span className="tabular-nums font-medium text-foreground w-24 text-right">
                  <Money value={Number(invoice.taxAmount)} currency={invoice.currency} compact />
                </span>
              </div>
            )}
            {invoice.discount && Number(invoice.discount) > 0 && (
              <div className="flex items-center gap-8 text-xs text-muted-foreground">
                <span>Discount</span>
                <span className="tabular-nums font-medium text-foreground w-24 text-right">
                  −<Money value={Number(invoice.discount)} currency={invoice.currency} compact />
                </span>
              </div>
            )}
            <div className="flex items-center gap-8 text-sm font-semibold border-t border-border pt-1.5 mt-0.5">
              <span>Total</span>
              <span className="tabular-nums w-24 text-right">
                <Money value={Number(invoice.total)} currency={invoice.currency} compact />
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold">Payment History</h2>
          </div>
          <PaymentsTable payments={payments} />
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold">Linked Credit Notes</h2>
          </div>
          <div className="p-1">
            <LinkedCreditNotes clientId={invoice.clientId} invoiceId={invoice.id} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold">Collection</h2>
          </div>
          <div className="p-4">
            <CollectionPanel invoice={invoice} />
          </div>
        </div>

        {invoice.notes && (
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1">
              Notes
            </p>
            <p className="text-xs text-foreground">{invoice.notes}</p>
          </div>
        )}
      </div>

      {paymentOpen && (
        <RecordPaymentDialog
          invoice={{
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            total: invoice.total,
            amountPaid: invoice.amountPaid ?? "0",
            currency: invoice.currency,
          }}
          open
          onOpenChange={handleClosePayment}
        />
      )}
    </PageWrapper>
  );
}

export default function AccountingInvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = use(params);
  return <InvoiceDetailContent invoiceId={Number(invoiceId)} />;
}
