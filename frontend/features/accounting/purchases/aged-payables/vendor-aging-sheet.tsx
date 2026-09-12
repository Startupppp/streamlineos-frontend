"use client";

import Link from "next/link";
import { AppSheet } from "@/components/shared";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMinorMoney } from "@/lib/accounting/money";
import { formatShortDate } from "@/lib/date-utils";
import type { ApAgingPartyRow } from "@/types/accounting-ap";
import { AGING_BUCKET_LABELS } from "../lib/ap-labels";

interface VendorAgingSheetProps {
  party: ApAgingPartyRow | null;
  functionalCurrency: string;
  onOpenChange: (open: boolean) => void;
}

export function VendorAgingSheet({
  party,
  functionalCurrency,
  onOpenChange,
}: VendorAgingSheetProps) {
  return (
    <AppSheet
      open={!!party}
      onOpenChange={onOpenChange}
      title={party ? `What we owe ${party.partyName}` : "Vendor"}
      description={
        party
          ? `${formatMinorMoney(party.totalMinor, functionalCurrency)} across ${party.items.length} document(s)`
          : undefined
      }
      className="sm:max-w-xl"
    >
      {!party ? null : party.items.length === 0 ? (
        <EmptyState
          compact
          className="border-0 bg-transparent"
          title="Nothing to show"
          description="This vendor's documents were not included in the report."
        />
      ) : (
        <ul className="space-y-2">
          {party.items.map((item) => (
            <li
              key={item.documentId}
              className="rounded-md border border-border/70 bg-card px-3 py-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/accounting/purchase-bills/${item.documentId}`}
                    className="block truncate text-sm font-medium text-status-info-ink hover:underline"
                  >
                    {item.vendorDocumentNumber ?? item.documentNumber ?? "Unnumbered"}
                  </Link>
                  <p className="text-dense text-muted-foreground">
                    Dated {formatShortDate(item.issueDate)}
                    {item.dueDate ? ` · due ${formatShortDate(item.dueDate)}` : ""}
                  </p>
                  <div className="mt-1">
                    <SemanticBadge
                      size="xs"
                      tone={item.bucket === "0-30" ? "neutral" : "warning"}
                      label={AGING_BUCKET_LABELS[item.bucket]}
                    />
                  </div>
                </div>
                <span className="shrink-0 font-mono text-sm tabular-nums">
                  {formatMinorMoney(item.openMinor, item.currency)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppSheet>
  );
}
