"use client";

import { useMemo } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { EntityFormSheet } from "@/components/shared";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMinorMoney, moneyInputValue, parseMoneyInput } from "@/lib/accounting/money";
import { formatShortDate } from "@/lib/date-utils";
import type { ApDocumentSummary } from "@/types/accounting-ap";
import type { ApAllocationInput } from "@/types/accounting-ap-payments";

const allocationFormSchema = z.object({
  amounts: z.array(z.string()),
});

type AllocationFormValues = z.infer<typeof allocationFormSchema>;

interface AllocateOpenBillsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  bills: ApDocumentSummary[];
  currency: string;
  availableMinor: number;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (allocations: ApAllocationInput[]) => void;
}

export function AllocateOpenBillsSheet({
  open,
  onOpenChange,
  title,
  description,
  bills,
  currency,
  availableMinor,
  submitLabel,
  isSubmitting,
  onSubmit,
}: AllocateOpenBillsSheetProps) {
  const defaultValues = useMemo<AllocationFormValues>(
    () => ({ amounts: bills.map(() => "0") }),
    [bills],
  );

  function handleSubmit(values: AllocationFormValues): void {
    const allocations: ApAllocationInput[] = [];
    for (const [index, bill] of bills.entries()) {
      const raw = values.amounts[index] ?? "";
      const amountMinor = parseMoneyInput(raw.trim() || "0", currency);
      if (amountMinor === null || amountMinor <= 0) continue;
      allocations.push({ documentId: bill.id, amountMinor });
    }
    onSubmit(allocations);
  }

  return (
    <EntityFormSheet<AllocationFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      resolver={zodResolver(allocationFormSchema)}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel={submitLabel}
      resetOnOpen
      className="sm:max-w-lg"
    >
      {(form) => (
        <div className="space-y-3">
          <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-label">
            {formatMinorMoney(availableMinor, currency)} available to spread across the bills below.
          </p>

          {bills.length === 0 ? (
            <EmptyState
              compact
              className="border-0 bg-transparent"
              title="Nothing left to settle"
              description="This vendor has no unpaid bills in the books."
            />
          ) : (
            bills.map((bill, index) => (
              <div key={bill.id} className="rounded-md border border-border/70 bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {bill.vendorDocumentNumber ?? bill.documentNumber ?? "Unnumbered bill"}
                    </p>
                    <p className="text-dense text-muted-foreground">
                      Dated {formatShortDate(bill.issueDate)} · still owed{" "}
                      {formatMinorMoney(bill.openMinor, bill.currency)}
                    </p>
                  </div>
                  <div className="w-32 shrink-0">
                    <FormField
                      control={form.control}
                      name={`amounts.${index}`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              inputMode="decimal"
                              className="tabular-nums text-right"
                              placeholder={moneyInputValue(0, currency)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </EntityFormSheet>
  );
}
