"use client";

import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SemanticBadge, type BadgeTone } from "@/components/ui/semantic-badge";
import type { DataTableColumn } from "@/components/ui/data-table";
import type { EnterpriseQuoteAction } from "@/hooks/api/billing/enterprise-quotes";
import type { EnterpriseQuoteListItem, EnterpriseQuoteStatus } from "@/hooks/api/billing/billing-growth-schema";
import { formatAmountInCurrency, formatNumber } from "@/lib/format-utils";
import { formatShortDate } from "@/lib/date-utils";

export const QUOTE_STATUS_META: Record<EnterpriseQuoteStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  PENDING_APPROVAL: { label: "Awaiting approval", tone: "warning" },
  APPROVED: { label: "Approved", tone: "info" },
  SENT: { label: "Sent", tone: "accent" },
  ACCEPTED: { label: "Accepted", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
  EXPIRED: { label: "Expired", tone: "neutral" },
};

export const QUOTE_HEADERS = ["Quote", "Seats", "Price / seat", "Term", "Status", "Valid until", ""];

/** The one next step (or two) each status allows, mirroring the backend's guards. */
const NEXT_ACTIONS: Record<EnterpriseQuoteStatus, readonly { action: EnterpriseQuoteAction; label: string }[]> = {
  DRAFT: [{ action: "submit", label: "Submit for approval" }],
  PENDING_APPROVAL: [
    { action: "approve", label: "Approve" },
    { action: "reject", label: "Send back to draft" },
  ],
  APPROVED: [{ action: "send", label: "Mark as sent" }],
  SENT: [{ action: "accept", label: "Accept quote" }],
  ACCEPTED: [],
  REJECTED: [],
  EXPIRED: [],
};

interface QuoteRowActionsProps {
  row: EnterpriseQuoteListItem;
  allowed: (action: EnterpriseQuoteAction) => boolean;
  onAction: (action: EnterpriseQuoteAction, row: EnterpriseQuoteListItem) => void;
}

function QuoteRowActions({ row, allowed, onAction }: QuoteRowActionsProps) {
  const actions = NEXT_ACTIONS[row.status].filter((entry) => allowed(entry.action));
  if (actions.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AnimatedIconButton icon={EllipsisIcon} iconSize={14} variant="ghost" size="sm" aria-label={`Actions for ${row.quoteRef}`} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((entry) => (
          <QuoteActionItem key={entry.action} row={row} action={entry.action} label={entry.label} onAction={onAction} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface QuoteActionItemProps {
  row: EnterpriseQuoteListItem;
  action: EnterpriseQuoteAction;
  label: string;
  onAction: QuoteRowActionsProps["onAction"];
}

function QuoteActionItem({ row, action, label, onAction }: QuoteActionItemProps) {
  function handleSelect() {
    onAction(action, row);
  }
  return <DropdownMenuItem onSelect={handleSelect}>{label}</DropdownMenuItem>;
}

function rupees(paise: number): string {
  return formatAmountInCurrency(paise / 100, "INR");
}

export function enterpriseQuoteColumns(
  allowed: QuoteRowActionsProps["allowed"],
  onAction: QuoteRowActionsProps["onAction"],
): DataTableColumn<EnterpriseQuoteListItem>[] {
  return [
    {
      key: "quote",
      header: "Quote",
      cell: (row) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{row.subject}</span>
          <span className="truncate text-xs text-muted-foreground">
            <span className="font-mono">{row.quoteRef}</span>
            {row.clientName ?? row.dealName ? ` · ${row.clientName ?? row.dealName}` : ""}
          </span>
        </div>
      ),
    },
    { key: "seats", header: "Seats", className: "font-mono tabular-nums", cell: (row) => formatNumber(row.negotiatedSeats, "en-IN") },
    { key: "price", header: "Price / seat", className: "font-mono tabular-nums", cell: (row) => rupees(row.pricePerSeatInPaise) },
    { key: "term", header: "Term", className: "tabular-nums", cell: (row) => `${row.contractTermMonths} mo` },
    {
      key: "status",
      header: "Status",
      cell: (row) => <SemanticBadge tone={QUOTE_STATUS_META[row.status].tone} label={QUOTE_STATUS_META[row.status].label} />,
    },
    { key: "validUntil", header: "Valid until", className: "tabular-nums", cell: (row) => formatShortDate(row.validUntil) },
    {
      key: "actions",
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => <QuoteRowActions row={row} allowed={allowed} onAction={onAction} />,
    },
  ];
}
