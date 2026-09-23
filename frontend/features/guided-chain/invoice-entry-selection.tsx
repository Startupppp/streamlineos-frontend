"use client";

import { useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { WizardSectionHeading } from "@/components/wizard-shell";
import { formatCurrencyForBilling } from "@/lib/format-utils";
import { cn } from "@/lib/utils";
import type { UninvoicedEntry } from "@/hooks/api/timesheets/billing-invoice-schema";

export function entryAmount(entry: UninvoicedEntry): number {
  return Number(entry.hours) * Number(entry.billRate ?? 0);
}

interface EntryRowProps {
  entry: UninvoicedEntry;
  checked: boolean;
  currency: string;
  onToggle: (entryId: number) => void;
}

function EntryRow({ entry, checked, currency, onToggle }: EntryRowProps) {
  const handleChange = useCallback(() => onToggle(entry.id), [onToggle, entry.id]);

  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-md border border-border px-3 py-2.5",
        checked ? "bg-muted/40" : "bg-card",
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={handleChange}
        aria-label={`Bill ${entry.hours} hours logged on ${entry.date}`}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {entry.projectName ?? "Unassigned"}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {entry.date}
          {entry.description ? ` · ${entry.description}` : ""}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-mono tabular-nums text-sm font-semibold text-foreground">
          {formatCurrencyForBilling(entryAmount(entry), currency)}
        </p>
        <p className="font-mono tabular-nums text-xs text-muted-foreground">
          {Number(entry.hours).toFixed(2)} h ×{" "}
          {formatCurrencyForBilling(Number(entry.billRate ?? 0), currency)}
        </p>
      </div>
    </li>
  );
}

interface InvoiceEntrySelectionProps {
  entries: UninvoicedEntry[];
  selectedIds: number[];
  currency: string;
  isLoading: boolean;
  isError: boolean;
  onToggle: (entryId: number) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onRetry: () => void;
}

export function InvoiceEntrySelection({
  entries,
  selectedIds,
  currency,
  isLoading,
  isError,
  onToggle,
  onSelectAll,
  onClearAll,
  onRetry,
}: InvoiceEntrySelectionProps) {
  if (isError)
    return (
      <ErrorState
        title="Couldn't load approved time"
        description="Something went wrong loading the approved, uninvoiced entries for this period."
        onRetry={onRetry}
      />
    );

  if (isLoading)
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full rounded-md" />
        <Skeleton className="h-14 w-full rounded-md" />
        <Skeleton className="h-14 w-full rounded-md" />
      </div>
    );

  if (entries.length === 0)
    return (
      <EmptyState
        title="No approved time to bill"
        description="Approve timesheet entries for this period, and they will appear here ready to invoice."
      />
    );

  const selected = new Set(selectedIds);

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <WizardSectionHeading>Approved time</WizardSectionHeading>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={onSelectAll}>
            Select all
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClearAll}>
            Clear
          </Button>
        </div>
      </div>
      <ul className="flex flex-1 min-h-0 flex-col gap-2 overflow-y-auto">
        {entries.map((entry) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            checked={selected.has(entry.id)}
            currency={currency}
            onToggle={onToggle}
          />
        ))}
      </ul>
    </div>
  );
}
