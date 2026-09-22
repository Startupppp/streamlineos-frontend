"use client";

import Link from "next/link";
import { AppSheet, ErrorState } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMinorMoney } from "@/lib/accounting/money";
import { formatShortDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useArOpenItems } from "@/hooks/api/accounting/ar";
import type {
  AgingBasis,
  AgingOpenItem,
} from "@/types/accounting/accounting-ar-receipts";
import { AGING_BUCKET_LABEL } from "./ar-labels";

interface AgingOpenItemsSheetProps {
  party: { id: string; name: string } | null;
  asOf: string;
  basis: AgingBasis;
  onOpenChange: (open: boolean) => void;
}

const KIND_LABEL: Readonly<Record<AgingOpenItem["kind"], string>> = {
  invoice: "Invoice",
  credit_note: "Credit note",
  unapplied_receipt: "Payment on account",
};

function itemHref(item: AgingOpenItem): string | null {
  if (item.kind === "invoice") return `/accounting/invoices/${item.documentId}`;
  if (item.kind === "credit_note")
    return `/accounting/credit-notes/${item.documentId}`;
  return null;
}

export function AgingOpenItemsSheet({
  party,
  asOf,
  basis,
  onOpenChange,
}: AgingOpenItemsSheetProps) {
  const openItemsQuery = useArOpenItems(
    { partyId: party?.id, asOf, basis },
    { enabled: party !== null },
  );
  const items = openItemsQuery.data ?? [];

  return (
    <AppSheet
      open={party !== null}
      onOpenChange={onOpenChange}
      title={party?.name ?? "Open items"}
      description={`Everything still open on ${formatShortDate(asOf)}.`}
      className="sm:max-w-xl"
    >
      {openItemsQuery.isError ? (
        <ErrorState
          compact
          title="Couldn't load their open items"
          description={getErrorMessage(openItemsQuery.error)}
          onRetry={() => void openItemsQuery.refetch()}
        />
      ) : openItemsQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          compact
          className="border-0 bg-transparent"
          title="Nothing open"
          description="This customer had a clear balance on that date."
        />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const href = itemHref(item);
            return (
              <li
                key={`${item.kind}-${item.documentId}`}
                className="flex items-start justify-between gap-3 rounded-md border border-border/70 px-3 py-2"
              >
                <div className="min-w-0">
                  {href ? (
                    <Link
                      href={href}
                      className="truncate text-sm font-medium text-status-info-ink hover:underline"
                    >
                      {item.documentNumber ?? KIND_LABEL[item.kind]}
                    </Link>
                  ) : (
                    <p className="truncate text-sm font-medium">
                      {item.documentNumber ?? KIND_LABEL[item.kind]}
                    </p>
                  )}
                  <p className="text-dense text-muted-foreground">
                    {KIND_LABEL[item.kind]} · {formatShortDate(item.basisDate)}{" "}
                    · {AGING_BUCKET_LABEL[item.bucket]}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-mono text-label tabular-nums">
                    {formatMinorMoney(item.openMinor, item.currency)}
                  </span>
                  {item.daysOverdue > 0 ? (
                    <Badge
                      variant="outline"
                      className="h-4 px-1.5 py-0 text-micro"
                    >
                      {item.daysOverdue} days late
                    </Badge>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppSheet>
  );
}
