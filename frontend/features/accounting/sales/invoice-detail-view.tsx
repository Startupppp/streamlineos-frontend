"use client";

import { useMemo, useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { FinanceStatusBadge, Money } from "@/features/accounting/shared";
import { RecordPaymentDialog } from "@/features/accounting/sales/record-payment-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useInvoice } from "@/hooks/api/invoice";
import { useCreditNotes } from "@/hooks/api/accounting/ar";
import { useCan } from "@/hooks/api/access";
import { AiActionsMenu, type AiAction } from "@/components/ai";
import type { FinanceStatus } from "@/features/accounting/shared";
import type { Invoice, Payment } from "@/types/invoice";
import type { CreditNote } from "@/types/accounting/ar";

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

const PAYMENT_COLUMNS: DataTableColumn<Payment>[] = [
  {
    key: "date",
    header: "Date",
    cell: (p) => (
      <span className="text-xs tabular-nums">{formatDate(p.paymentDate)}</span>
    ),
  },
  {
    key: "method",
    header: "Method",
    cell: (p) => (
      <span className="text-xs capitalize">
        {p.paymentMethod.replace(/_/g, " ")}
      </span>
    ),
  },
  {
    key: "reference",
    header: "Reference",
    cell: (p) => (
      <span className="text-xs font-mono text-muted-foreground">
        {p.referenceNumber ?? "—"}
      </span>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    headerClassName: "text-right",
    className: "text-right",
    cell: (p) => (
      <span className="text-xs tabular-nums">
        <Money value={Number(p.amount)} compact />
      </span>
    ),
  },
];

function getPaymentRowKey(p: Payment): string | number {
  return p.id;
}

interface PaymentsTableProps {
  payments: Payment[];
}

function PaymentsTable({ payments }: PaymentsTableProps) {
  return (
    <DataTable
      data={payments}
      columns={PAYMENT_COLUMNS}
      getRowKey={getPaymentRowKey}
      emptyState={
        <EmptyState
          illustrationPreset="expenses"
          title="No payments recorded"
          compact
        />
      }
    />
  );
}

const CREDIT_NOTE_COLUMNS: DataTableColumn<CreditNote>[] = [
  {
    key: "creditNoteNumber",
    header: "#",
    cell: (cn) => (
      <span className="text-xs font-mono">{cn.creditNoteNumber}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (cn) =>
      cn.status === "APPLIED" ? (
        <Badge className="bg-status-success-surface text-status-success-ink border-status-success-rule text-micro h-4 px-1.5">
          Applied
        </Badge>
      ) : (
        <FinanceStatusBadge status={toFinanceStatus(cn.status)} />
      ),
  },
  {
    key: "total",
    header: "Total",
    headerClassName: "text-right",
    className: "text-right",
    cell: (cn) => (
      <span className="text-xs tabular-nums">
        <Money value={Number(cn.total)} compact />
      </span>
    ),
  },
  {
    key: "appliedAmount",
    header: "Applied",
    headerClassName: "text-right",
    className: "text-right",
    cell: (cn) => (
      <span className="text-xs tabular-nums">
        <Money value={Number(cn.appliedAmount)} compact />
      </span>
    ),
  },
];

function getCreditNoteRowKey(cn: CreditNote): string | number {
  return cn.id;
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
    return <Skeleton className="h-4 w-full" />;
  }

  if (linked.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-3 px-1">
        No credit notes linked to this invoice.
      </p>
    );
  }

  return (
    <DataTable
      data={linked}
      columns={CREDIT_NOTE_COLUMNS}
      getRowKey={getCreditNoteRowKey}
    />
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
        <p className="text-muted-foreground uppercase tracking-wider font-semibold text-micro mb-0.5">
          Balance Due
        </p>
        <p className="font-semibold text-sm tabular-nums">
          <Money value={balance} currency={invoice.currency} compact />
        </p>
      </div>
      <div>
        <p className="text-muted-foreground uppercase tracking-wider font-semibold text-micro mb-0.5">
          Collection Owner
        </p>
        <p className="text-foreground">
          {invoice.collectionOwnerId ?? (
            <span className="text-muted-foreground">Unassigned</span>
          )}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground uppercase tracking-wider font-semibold text-micro mb-0.5">
          Promise to Pay
        </p>
        <p className="text-foreground">
          {invoice.promiseToPayDate ? (
            formatDate(invoice.promiseToPayDate)
          ) : (
            <span className="text-muted-foreground">Not set</span>
          )}
        </p>
      </div>
    </div>
  );
}

interface InvoiceAiActionsProps {
  invoice: Invoice;
}

function InvoiceAiActions({ invoice }: InvoiceAiActionsProps) {
  const canAi = useCan("accounting:ai:use");

  const actions = useMemo<AiAction[]>(
    () => [
      {
        key: "extract-document",
        label: "Extract document",
        description: "Upload an invoice image/PDF for AI-assisted draft",
        run: async () => {
          return {
            text: `Document extraction requires uploading a file.\n\nTo extract invoice fields from a PDF or image:\n1. Navigate to Purchases → Bills and open the bill for this invoice\n2. Use the "Extract document" action to upload the file\n\nAI extracts: vendor, date, document number, amounts, and line items as a human-reviewed draft. AI never posts or approves entries automatically.\n\nInvoice reference: ${invoice.invoiceNumber} · ${invoice.client?.name ?? "—"}`,
          };
        },
      },
    ],
    [invoice.invoiceNumber, invoice.client?.name],
  );

  if (!canAi) return null;

  return (
    <AiActionsMenu
      actions={actions}
      triggerLabel="AI"
      menuLabel="Invoice AI"
      align="end"
    />
  );
}

export function InvoiceDetailSkeleton() {
  return (
    <PageWrapper title="Invoice" backHref="/accounting/invoices">
      <div className="space-y-4">
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
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

interface InvoiceDetailContentProps {
  invoiceId: number;
}

type IndexedLineItem = Invoice["lineItems"][number] & { _idx: number };

function getLineItemRowKey(item: IndexedLineItem): number {
  return item._idx;
}

export function InvoiceDetailContent({ invoiceId }: InvoiceDetailContentProps) {
  const { data: invoice, isLoading, error, refetch } = useInvoice(invoiceId);
  const [paymentOpen, setPaymentOpen] = useState(false);

  function handleRetry(): void {
    void refetch();
  }

  function handleOpenPayment(): void {
    setPaymentOpen(true);
  }

  function handleClosePayment(): void {
    setPaymentOpen(false);
  }

  const lineItemColumns = useMemo<DataTableColumn<IndexedLineItem>[]>(
    () => [
      {
        key: "description",
        header: "Description",
        cell: (item) => <TruncatedText text={item.description} lines={2} className="text-xs" />,
      },
      {
        key: "quantity",
        header: "Qty",
        headerClassName: "text-right w-20",
        className: "text-right w-20",
        cell: (item) => (
          <span className="text-xs tabular-nums">{item.quantity}</span>
        ),
      },
      {
        key: "rate",
        header: "Rate",
        headerClassName: "text-right w-28",
        className: "text-right w-28",
        cell: (item) => (
          <span className="text-xs tabular-nums">
            <Money value={item.rate} currency={invoice?.currency} compact />
          </span>
        ),
      },
      {
        key: "amount",
        header: "Amount",
        headerClassName: "text-right w-28",
        className: "text-right w-28 font-medium",
        cell: (item) => (
          <span className="text-xs tabular-nums">
            <Money value={item.amount} currency={invoice?.currency} compact />
          </span>
        ),
      },
    ],
    [invoice?.currency],
  );

  const indexedLineItems = useMemo<IndexedLineItem[]>(
    () => (invoice?.lineItems ?? []).map((item, i) => ({ ...item, _idx: i })),
    [invoice?.lineItems],
  );

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
      title={invoice.invoiceNumber}
      backHref="/accounting/invoices"
      badge={<FinanceStatusBadge status={toFinanceStatus(invoice.status)} />}
      actions={
        <div className="flex items-center gap-2">
          <InvoiceAiActions invoice={invoice} />
          {balance > 0 && invoice.status !== "VOIDED" && (
            <Button size="sm" onClick={handleOpenPayment}>
              Record Payment
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-micro uppercase font-semibold tracking-wider text-muted-foreground mb-0.5">
                Customer
              </p>
              <TruncatedText text={invoice.client?.name ?? "—"} className="text-sm font-medium" />
            </div>
            <div>
              <p className="text-micro uppercase font-semibold tracking-wider text-muted-foreground mb-0.5">
                Invoice Date
              </p>
              <p className="text-sm tabular-nums">
                {formatDate(invoice.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-micro uppercase font-semibold tracking-wider text-muted-foreground mb-0.5">
                Due Date
              </p>
              <p className="text-sm tabular-nums">
                {formatDate(invoice.dueDate)}
              </p>
            </div>
            <div>
              <p className="text-micro uppercase font-semibold tracking-wider text-muted-foreground mb-0.5">
                Total
              </p>
              <p className="text-sm font-semibold tabular-nums">
                <Money
                  value={Number(invoice.total)}
                  currency={invoice.currency}
                  compact
                />
              </p>
            </div>
            <div>
              <p className="text-micro uppercase font-semibold tracking-wider text-muted-foreground mb-0.5">
                Amount Paid
              </p>
              <p className="text-sm tabular-nums text-status-success-ink font-medium">
                <Money value={amountPaid} currency={invoice.currency} compact />
              </p>
            </div>
            <div>
              <p className="text-micro uppercase font-semibold tracking-wider text-muted-foreground mb-0.5">
                Balance Due
              </p>
              <p className="text-sm font-semibold tabular-nums text-status-danger-ink">
                <Money value={balance} currency={invoice.currency} compact />
              </p>
            </div>
            {invoice.project && (
              <div>
                <p className="text-micro uppercase font-semibold tracking-wider text-muted-foreground mb-0.5">
                  Project
                </p>
                <TruncatedText text={invoice.project.name} className="text-sm" />
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold">Line Items</h2>
          </div>
          <DataTable
            data={indexedLineItems}
            columns={lineItemColumns}
            getRowKey={getLineItemRowKey}
            className="rounded-none border-0 border-t border-border"
          />
          <div className="px-4 py-3 border-t border-border space-y-1.5 flex flex-col items-end">
            <div className="flex items-center gap-8 text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums font-medium text-foreground w-24 text-right">
                <Money
                  value={Number(invoice.subtotal)}
                  currency={invoice.currency}
                  compact
                />
              </span>
            </div>
            {invoice.taxAmount && Number(invoice.taxAmount) > 0 && (
              <div className="flex items-center gap-8 text-xs text-muted-foreground">
                <span>Tax ({invoice.taxRate ?? 0}%)</span>
                <span className="tabular-nums font-medium text-foreground w-24 text-right">
                  <Money
                    value={Number(invoice.taxAmount)}
                    currency={invoice.currency}
                    compact
                  />
                </span>
              </div>
            )}
            {invoice.discount && Number(invoice.discount) > 0 && (
              <div className="flex items-center gap-8 text-xs text-muted-foreground">
                <span>Discount</span>
                <span className="tabular-nums font-medium text-foreground w-24 text-right">
                  −
                  <Money
                    value={Number(invoice.discount)}
                    currency={invoice.currency}
                    compact
                  />
                </span>
              </div>
            )}
            <div className="flex items-center gap-8 text-sm font-semibold border-t border-border pt-1.5 mt-0.5">
              <span>Total</span>
              <span className="tabular-nums w-24 text-right">
                <Money
                  value={Number(invoice.total)}
                  currency={invoice.currency}
                  compact
                />
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
            <LinkedCreditNotes
              clientId={invoice.clientId}
              invoiceId={invoice.id}
            />
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
            <p className="text-micro uppercase font-semibold tracking-wider text-muted-foreground mb-1">
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
