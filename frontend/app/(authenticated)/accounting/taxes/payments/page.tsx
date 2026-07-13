"use client";

import { useState } from "react";
import Link from "next/link";
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
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useTaxPayments,
  useCreateTaxPayment,
  useDeleteTaxPayment,
  useCreateTaxAdjustment,
} from "@/hooks/api/accounting/taxes";
import {
  TaxPaymentFormFields,
  paymentSchema,
  PAYMENT_DEFAULTS,
} from "@/features/accounting/taxes/tax-payment-form-fields";
import {
  TaxAdjustmentFormFields,
  adjustmentSchema,
  ADJUSTMENT_DEFAULTS,
} from "@/features/accounting/taxes/tax-adjustment-form-fields";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TaxPayment } from "@/types/accounting/taxes";
import type { AdjustmentFormValues } from "@/features/accounting/taxes/tax-adjustment-form-fields";
import type { PaymentFormValues } from "@/features/accounting/taxes/tax-payment-form-fields";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

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
      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2 text-xs dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-500/10"
      isPending={isPending}
      onClick={handleClick}
    >
      Delete
    </LoadingButton>
  );
}

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
        <ErrorState title="Failed to load tax payments" onRetry={handleRetry} />
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
        {(form) => <TaxPaymentFormFields form={form} />}
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
        {(form) => <TaxAdjustmentFormFields form={form} />}
      </EntityFormDialog>
    </PageWrapper>
  );
}