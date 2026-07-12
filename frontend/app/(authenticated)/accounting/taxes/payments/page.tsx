"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { LoadingButton } from "@/components/ui/loading-button";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyApprovalIllustration } from "@/components/illustrations";
import { LoadingState, ErrorState, EntityFormDialog, EntityFormSheet } from "@/components/shared";
import { Money } from "@/features/accounting/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useTaxPayments,
  useCreateTaxPayment,
  useDeleteTaxPayment,
  useCreateTaxAdjustment,
} from "@/hooks/api/accounting/taxes";
import type { TaxPayment, TaxType } from "@/types/accounting/taxes";

const TAX_TYPES: TaxType[] = [
  "GST",
  "CGST_SGST",
  "IGST",
  "VAT",
  "TDS",
  "TCS",
  "EXEMPT",
  "ZERO_RATED",
];

const TAX_TYPE_OPTIONS: { value: TaxType; label: string }[] = [
  { value: "GST", label: "GST" },
  { value: "CGST_SGST", label: "CGST/SGST" },
  { value: "IGST", label: "IGST" },
  { value: "VAT", label: "VAT" },
  { value: "TDS", label: "TDS" },
  { value: "TCS", label: "TCS" },
  { value: "EXEMPT", label: "Exempt" },
  { value: "ZERO_RATED", label: "Zero Rated" },
];

const SYSTEM_PURPOSE_OPTIONS = [
  { value: "TAX_PAYABLE", label: "Tax Payable" },
  { value: "TAX_RECEIVABLE", label: "Tax Receivable" },
  { value: "CUSTOM", label: "Custom" },
] as const;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

const paymentSchema = z.object({
  taxType: z.enum(TAX_TYPES as [TaxType, ...TaxType[]]),
  periodStart: z.string().min(1, "Required"),
  periodEnd: z.string().min(1, "Required"),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount"),
  paidDate: z.string().min(1, "Required"),
  reference: z.string().min(1, "Required"),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

const lineSchema = z.object({
  systemPurpose: z.enum(["TAX_PAYABLE", "TAX_RECEIVABLE", "CUSTOM"]),
  debit: z.string().min(1, "Required"),
  credit: z.string().min(1, "Required"),
  lineDescription: z.string().min(1, "Required"),
});

const adjustmentSchema = z.object({
  entryDate: z.string().min(1, "Required"),
  description: z.string().min(1, "Required"),
  line1: lineSchema,
  line2: lineSchema,
});

type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;

interface DeletePaymentButtonProps {
  payment: TaxPayment;
  isPending: boolean;
  onDelete: (payment: TaxPayment) => void;
}

function DeletePaymentButton({ payment, isPending, onDelete }: DeletePaymentButtonProps) {
  function handleClick(): void {
    onDelete(payment);
  }
  return (
    <LoadingButton
      size="sm"
      variant="ghost"
      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2 text-xs"
      isPending={isPending}
      onClick={handleClick}
    >
      Delete
    </LoadingButton>
  );
}

const PAYMENT_DEFAULTS: PaymentFormValues = {
  taxType: "GST",
  periodStart: "",
  periodEnd: "",
  amount: "",
  paidDate: "",
  reference: "",
};

const ADJUSTMENT_DEFAULTS: AdjustmentFormValues = {
  entryDate: "",
  description: "",
  line1: { systemPurpose: "TAX_PAYABLE", debit: "", credit: "", lineDescription: "" },
  line2: { systemPurpose: "TAX_RECEIVABLE", debit: "", credit: "", lineDescription: "" },
};

export default function TaxPaymentsPage() {
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);

  const canPay = useCan("accounting:taxes:pay");
  const canManage = useCan("accounting:taxes:manage");

  const { data, isLoading, isError, refetch } = useTaxPayments({ pageSize: 100 });
  const createPayment = useCreateTaxPayment();
  const deletePayment = useDeleteTaxPayment();
  const createAdjustment = useCreateTaxAdjustment();

  const payments = data?.items ?? [];

  function handleRecordPayment(): void {
    setPaymentSheetOpen(true);
  }

  function handleAdjustment(): void {
    setAdjustmentDialogOpen(true);
  }

  function handleDeletePayment(payment: TaxPayment): void {
    deletePayment.mutate(payment.id, {
      onSuccess: () => toast.success("Payment deleted"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handlePaymentSubmit(values: PaymentFormValues): void {
    createPayment.mutate(values, {
      onSuccess: () => {
        toast.success("Payment recorded");
        setPaymentSheetOpen(false);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleAdjustmentSubmit(values: AdjustmentFormValues): void {
    const { entryDate, description, line1, line2 } = values;
    createAdjustment.mutate(
      {
        entryDate,
        description,
        lines: [
          {
            systemPurpose: line1.systemPurpose === "CUSTOM" ? undefined : line1.systemPurpose,
            debit: line1.debit,
            credit: line1.credit,
            description: line1.lineDescription,
          },
          {
            systemPurpose: line2.systemPurpose === "CUSTOM" ? undefined : line2.systemPurpose,
            debit: line2.debit,
            credit: line2.credit,
            description: line2.lineDescription,
          },
        ],
      },
      {
        onSuccess: () => {
          toast.success("Adjustment recorded");
          setAdjustmentDialogOpen(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleRetry(): void {
    void refetch();
  }

  const columns: DataTableColumn<TaxPayment>[] = [
    {
      key: "period",
      header: "Period",
      cell: (row) => (
        <span className="text-sm tabular-nums">
          {formatDate(row.periodStart)} – {formatDate(row.periodEnd)}
        </span>
      ),
    },
    {
      key: "taxType",
      header: "Type",
      cell: (row) => (
        <Badge variant="secondary" className="font-mono text-xs">
          {row.taxType.replace("_", "/")}
        </Badge>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right",
      headerClassName: "text-right",
      cell: (row) => <Money value={parseFloat(row.amount)} />,
    },
    {
      key: "paidDate",
      header: "Paid Date",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{formatDate(row.paidDate)}</span>
      ),
    },
    {
      key: "reference",
      header: "Reference",
      cell: (row) => (
        <span className="font-mono text-xs text-muted-foreground">{row.reference}</span>
      ),
    },
    {
      key: "journal",
      header: "Journal",
      cell: (row) =>
        row.journalEntryId ? (
          <Link
            href={`/accounting/journal/${row.journalEntryId}`}
            className="text-xs text-blue-600 hover:underline"
          >
            View
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => {
        const isSameDay = row.paidDate === todayStr();
        if (!canPay || !isSameDay) return null;
        return (
          <DeletePaymentButton
            payment={row}
            isPending={deletePayment.isPending}
            onDelete={handleDeletePayment}
          />
        );
      },
    },
  ];

  const actions = (
    <div className="flex items-center gap-2">
      {canManage && (
        <Button size="sm" variant="outline" onClick={handleAdjustment}>
          Record Adjustment
        </Button>
      )}
      {canPay && (
        <Button size="sm" onClick={handleRecordPayment}>
          Record Payment
        </Button>
      )}
    </div>
  );

  return (
    <PageWrapper
      eyebrow="Taxes"
      title="Tax Payments"
      subtitle="Record and track tax payments by period and type."
      backHref="/accounting/taxes"
      actions={actions}
    >
      {isLoading ? (
        <LoadingState variant="table" rows={8} />
      ) : isError ? (
        <ErrorState
          title="Failed to load tax payments"
          onRetry={handleRetry}
        />
      ) : (
      <DataTable
        data={payments}
        columns={columns}
        getRowKey={(row) => row.id}
        emptyState={
          <EmptyState
            illustration={<EmptyApprovalIllustration />}
            title="No tax payments yet"
            description="Recorded payments will appear here."
          />
        }
        minWidth="720px"
      />
      )}

      <EntityFormSheet
        open={paymentSheetOpen}
        onOpenChange={setPaymentSheetOpen}
        title="Record Tax Payment"
        description="Log a tax payment against a period."
        resolver={zodResolver(paymentSchema)}
        defaultValues={PAYMENT_DEFAULTS}
        onSubmit={handlePaymentSubmit}
        isSubmitting={createPayment.isPending}
        submitLabel="Record Payment"
        resetOnOpen
      >
        {(form) => (
          <>
            <div className="space-y-1">
              <Label>Tax Type</Label>
              <Controller
                control={form.control}
                name="taxType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TAX_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.taxType && (
                <p className="text-xs text-red-500">{form.formState.errors.taxType.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Period Start</Label>
                <Input type="date" {...form.register("periodStart")} />
                {form.formState.errors.periodStart && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.periodStart.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Period End</Label>
                <Input type="date" {...form.register("periodEnd")} />
                {form.formState.errors.periodEnd && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.periodEnd.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Amount</Label>
              <Input type="text" placeholder="e.g. 1500.00" {...form.register("amount")} />
              {form.formState.errors.amount && (
                <p className="text-xs text-red-500">{form.formState.errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Paid Date</Label>
              <Input type="date" {...form.register("paidDate")} />
              {form.formState.errors.paidDate && (
                <p className="text-xs text-red-500">{form.formState.errors.paidDate.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Reference</Label>
              <Input placeholder="Challan / UTR number" {...form.register("reference")} />
              {form.formState.errors.reference && (
                <p className="text-xs text-red-500">{form.formState.errors.reference.message}</p>
              )}
            </div>
          </>
        )}
      </EntityFormSheet>

      <EntityFormDialog
        open={adjustmentDialogOpen}
        onOpenChange={setAdjustmentDialogOpen}
        title="Record Tax Adjustment"
        description="Create a two-line journal entry for a tax adjustment."
        resolver={zodResolver(adjustmentSchema)}
        defaultValues={ADJUSTMENT_DEFAULTS}
        onSubmit={handleAdjustmentSubmit}
        isSubmitting={createAdjustment.isPending}
        submitLabel="Record Adjustment"
        resetOnOpen
        className="max-w-2xl"
      >
        {(form) => (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Entry Date</Label>
                <Input type="date" {...form.register("entryDate")} />
                {form.formState.errors.entryDate && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.entryDate.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Input placeholder="Adjustment reason" {...form.register("description")} />
                {form.formState.errors.description && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>
            </div>

            {(["line1", "line2"] as const).map((lineKey, idx) => (
              <div key={lineKey} className="rounded-lg border border-border p-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Line {idx + 1}
                </p>
                <div className="space-y-1">
                  <Label>Purpose</Label>
                  <Controller
                    control={form.control}
                    name={`${lineKey}.systemPurpose`}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select purpose" />
                        </SelectTrigger>
                        <SelectContent>
                          {SYSTEM_PURPOSE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Debit</Label>
                    <Input
                      type="text"
                      placeholder="0.00"
                      {...form.register(`${lineKey}.debit`)}
                    />
                    {form.formState.errors[lineKey]?.debit && (
                      <p className="text-xs text-red-500">
                        {form.formState.errors[lineKey]?.debit?.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label>Credit</Label>
                    <Input
                      type="text"
                      placeholder="0.00"
                      {...form.register(`${lineKey}.credit`)}
                    />
                    {form.formState.errors[lineKey]?.credit && (
                      <p className="text-xs text-red-500">
                        {form.formState.errors[lineKey]?.credit?.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Line Description</Label>
                  <Input
                    placeholder="e.g. Tax payable reversal"
                    {...form.register(`${lineKey}.lineDescription`)}
                  />
                  {form.formState.errors[lineKey]?.lineDescription && (
                    <p className="text-xs text-red-500">
                      {form.formState.errors[lineKey]?.lineDescription?.message}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </EntityFormDialog>
    </PageWrapper>
  );
}
