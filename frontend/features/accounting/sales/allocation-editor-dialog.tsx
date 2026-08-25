"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppDialog, ErrorState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney, parseMoneyInput } from "@/lib/accounting/money";
import { formatShortDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useArInvoices } from "@/hooks/api/accounting/ar";
import type { AllocationLineInput, ArDocumentSummary } from "@/types/accounting-ar";

const OPEN_ITEMS_PAGE_SIZE = 50;

interface AllocationEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  partyId: string;
  currency: string;
  availableMinor: number;
  isPending: boolean;
  onSubmit: (allocations: AllocationLineInput[]) => void;
}

function buildSchema(currency: string, invoices: ArDocumentSummary[]) {
  return z.object({
    rows: z.array(
      z.object({
        documentId: z.string(),
        amount: z.string().trim(),
      }),
    ),
  }).superRefine((values, ctx) => {
    let anyAmount = false;
    values.rows.forEach((row, index) => {
      if (row.amount.length === 0) return;
      const minor = parseMoneyInput(row.amount, currency);
      if (minor === null || minor <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["rows", index, "amount"],
          message: "Enter an amount this currency supports",
        });
        return;
      }
      const invoice = invoices[index];
      if (invoice && minor > invoice.openMinor) {
        ctx.addIssue({
          code: "custom",
          path: ["rows", index, "amount"],
          message: `More than the ${formatMoney(invoice.openMinor, currency)} still open`,
        });
        return;
      }
      anyAmount = true;
    });
    if (!anyAmount) {
      ctx.addIssue({
        code: "custom",
        path: ["rows"],
        message: "Enter at least one amount",
      });
    }
  });
}

type AllocationFormValues = { rows: Array<{ documentId: string; amount: string }> };

function AllocationForm({
  invoices,
  currency,
  availableMinor,
  isPending,
  onSubmit,
  onCancel,
}: {
  invoices: ArDocumentSummary[];
  currency: string;
  availableMinor: number;
  isPending: boolean;
  onSubmit: (allocations: AllocationLineInput[]) => void;
  onCancel: () => void;
}) {
  const schema = useMemo(() => buildSchema(currency, invoices), [currency, invoices]);
  const form = useForm<AllocationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      rows: invoices.map((invoice) => ({ documentId: invoice.id, amount: "" })),
    },
  });

  function handleSubmit(values: AllocationFormValues): void {
    const allocations: AllocationLineInput[] = [];
    values.rows.forEach((row) => {
      if (row.amount.length === 0) return;
      const minor = parseMoneyInput(row.amount, currency);
      if (minor === null || minor <= 0) return;
      allocations.push({ documentId: row.documentId, amountMinor: minor });
    });
    onSubmit(allocations);
  }

  const rowsError = form.formState.errors.rows?.message;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
        <p className="text-label text-muted-foreground">
          {formatMoney(availableMinor, currency)} left to apply.
        </p>
        <ul className="space-y-2">
          {invoices.map((invoice, index) => (
            <li
              key={invoice.id}
              className="grid grid-cols-[minmax(0,1fr)_9rem] items-center gap-2 rounded-md border border-border/70 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {invoice.documentNumber ?? "Draft invoice"}
                </p>
                <p className="text-dense text-muted-foreground">
                  {invoice.dueDate ? `Due ${formatShortDate(invoice.dueDate)}` : "Due on receipt"} ·{" "}
                  {formatMoney(invoice.openMinor, invoice.currency)} open
                </p>
              </div>
              <FormField
                control={form.control}
                name={`rows.${index}.amount`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        inputMode="decimal"
                        placeholder="0.00"
                        className="text-right font-mono"
                        aria-label={`Amount for ${invoice.documentNumber ?? "draft invoice"}`}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </li>
          ))}
        </ul>
        {rowsError ? (
          <p className="text-xs text-destructive" role="alert">
            {rowsError}
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <LoadingButton type="submit" isPending={isPending}>
            Apply
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
}

export function AllocationEditorDialog({
  open,
  onOpenChange,
  title,
  description,
  partyId,
  currency,
  availableMinor,
  isPending,
  onSubmit,
}: AllocationEditorDialogProps) {
  const invoicesQuery = useArInvoices(
    { partyId, openOnly: true, pageSize: OPEN_ITEMS_PAGE_SIZE },
    { enabled: open && !!partyId },
  );
  const invoices = invoicesQuery.data?.items ?? [];

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      className="sm:max-w-lg"
    >
      {invoicesQuery.isError ? (
        <ErrorState
          compact
          title="Couldn't load their open invoices"
          description={getErrorMessage(invoicesQuery.error)}
          onRetry={() => void invoicesQuery.refetch()}
        />
      ) : invoicesQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : invoices.length === 0 ? (
        <EmptyState
          compact
          className="border-0 bg-transparent"
          title="Nothing left to apply this to"
          description="This customer has no invoices with a balance."
        />
      ) : (
        <AllocationForm
          invoices={invoices}
          currency={currency}
          availableMinor={availableMinor}
          isPending={isPending}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
        />
      )}
    </AppDialog>
  );
}
