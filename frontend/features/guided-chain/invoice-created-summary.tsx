"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WizardSectionHeading } from "@/components/wizard-shell";
import { formatCurrencyForBilling } from "@/lib/format-utils";
import type { InvoiceFromTimesheetsResult } from "@/hooks/api/timesheets/billing-invoice-schema";

interface InvoiceCreatedSummaryProps {
  result: InvoiceFromTimesheetsResult;
}

export function InvoiceCreatedSummary({ result }: InvoiceCreatedSummaryProps) {
  const href = `/billing/invoices/${String(result.invoice.id)}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 rounded-md border border-status-success-rule bg-status-success-surface px-3 py-3">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-success-ink" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-status-success-ink">
            {result.invoice.invoiceNumber} created
          </p>
          <p className="text-xs text-status-success-ink">
            {result.timesheetEntryIds.length} approved{" "}
            {result.timesheetEntryIds.length === 1 ? "entry is" : "entries are"} now
            marked invoiced and cannot be billed again.
          </p>
        </div>
      </div>

      <WizardSectionHeading>Next step</WizardSectionHeading>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-border bg-muted/30 px-3 py-3">
        <dt className="text-xs text-muted-foreground">Status</dt>
        <dd className="text-right text-xs font-medium text-foreground">
          {result.invoice.status}
        </dd>
        <dt className="text-xs text-muted-foreground">Total</dt>
        <dd className="text-right font-mono tabular-nums text-xs font-semibold text-foreground">
          {formatCurrencyForBilling(
            Number(result.invoice.total),
            result.invoice.currency,
          )}
        </dd>
      </dl>

      <p className="text-xs text-muted-foreground">
        Open the invoice to send it and record the payment against it.
      </p>

      <Button asChild className="w-full">
        <Link href={href}>Open invoice</Link>
      </Button>
    </div>
  );
}
