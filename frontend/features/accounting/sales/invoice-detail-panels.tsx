"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/ui/truncated-text";
import { FinanceStatusBadge, Money } from "@/features/accounting/shared";
import { useCreditNotes } from "@/hooks/api/accounting/ar";
import { useCan } from "@/hooks/api/access";
import { AiActionsMenu, type AiAction } from "@/components/ai";
import type { FinanceStatus } from "@/features/accounting/shared";
import type { Invoice, Payment } from "@/types/invoice";
import type { CreditNote } from "@/types/accounting/ar";

export const STATUS_MAP: Record<string, FinanceStatus> = {
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

export function toFinanceStatus(status: string): FinanceStatus {
  return STATUS_MAP[status] ?? "DRAFT";
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

const PAYMENT_COLUMNS: DataTableColumn<Payment>[] = [
  {
    key: "date",
    header: "Date",
    cell: (p) => <span className="text-xs tabular-nums">{formatDate(p.paymentDate)}</span>,
  },
  {
    key: "method",
    header: "Method",
    cell: (p) => <span className="text-xs capitalize">{p.paymentMethod.replace(/_/g, " ")}</span>,
  },
  {
    key: "reference",
    header: "Reference",
    cell: (p) => (
      <span className="text-xs font-mono text-muted-foreground">{p.referenceNumber ?? "—"}</span>
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

export function PaymentsTable({ payments }: PaymentsTableProps) {
  return (
    <DataTable
      data={payments}
      columns={PAYMENT_COLUMNS}
      getRowKey={getPaymentRowKey}
      emptyState={
        <EmptyState illustrationPreset="expenses" title="No payments recorded" compact />
      }
    />
  );
}

const CREDIT_NOTE_COLUMNS: DataTableColumn<CreditNote>[] = [
  {
    key: "creditNoteNumber",
    header: "#",
    cell: (cn) => <span className="text-xs font-mono">{cn.creditNoteNumber}</span>,
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

export function LinkedCreditNotes({ clientId, invoiceId }: LinkedCreditNotesProps) {
  const creditNotesQuery = useCreditNotes(clientId !== null ? { clientId } : {});
  const linked = (creditNotesQuery.data?.items ?? []).filter(
    (cn) => cn.invoiceId === invoiceId,
  );

  if (creditNotesQuery.isLoading) return <Skeleton className="h-4 w-full" />;

  if (linked.length === 0)
    return (
      <p className="text-xs text-muted-foreground py-3 px-1">
        No credit notes linked to this invoice.
      </p>
    );

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

export function CollectionPanel({ invoice }: CollectionPanelProps) {
  const balance = Math.max(0, Number(invoice.total) - Number(invoice.amountPaid ?? "0"));
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

export function InvoiceAiActions({ invoice }: InvoiceAiActionsProps) {
  const canAi = useCan("accounting:ai:use");

  const actions = useMemo<AiAction[]>(
    () => [
      {
        key: "extract-document",
        label: "Extract document",
        description: "Upload an invoice image/PDF for AI-assisted draft",
        run: async () => ({
          text: `Document extraction requires uploading a file.\n\nTo extract invoice fields from a PDF or image:\n1. Navigate to Purchases → Bills and open the bill for this invoice\n2. Use the "Extract document" action to upload the file\n\nAI extracts: vendor, date, document number, amounts, and line items as a human-reviewed draft. AI never posts or approves entries automatically.\n\nInvoice reference: ${invoice.invoiceNumber} · ${invoice.client?.name ?? "—"}`,
        }),
      },
    ],
    [invoice.invoiceNumber, invoice.client?.name],
  );

  if (!canAi) return null;

  return (
    <AiActionsMenu actions={actions} triggerLabel="AI" menuLabel="Invoice AI" align="end" />
  );
}
