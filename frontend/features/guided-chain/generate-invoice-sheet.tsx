"use client";

import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AppSheet } from "@/components/shared/app-sheet";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Form } from "@/components/ui/form";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useGenerateInvoiceFromTimesheets,
  useUninvoicedEntries,
} from "@/hooks/api/timesheets/billing-invoice";
import type { InvoiceFromTimesheetsResult } from "@/hooks/api/timesheets/billing-invoice-schema";
import {
  GENERATE_INVOICE_DEFAULTS,
  generateInvoiceSchema,
  type GenerateInvoiceFormValues,
} from "./generate-invoice-schema";
import { InvoiceEntrySelection, entryAmount } from "./invoice-entry-selection";
import { InvoiceDetailsFields } from "./invoice-details-fields";
import { InvoiceCreatedSummary } from "./invoice-created-summary";

interface GenerateInvoiceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startDate: string;
  endDate: string;
  projectId: number | null;
}

type Step = "select" | "details" | "done";

export function GenerateInvoiceSheet({
  open,
  onOpenChange,
  startDate,
  endDate,
  projectId,
}: GenerateInvoiceSheetProps) {
  const canCreateInvoice = useCan("accounting:create");
  const [step, setStep] = useState<Step>("select");
  const [selectedIds, setSelectedIds] = useState<number[] | null>(null);
  const [result, setResult] = useState<InvoiceFromTimesheetsResult | null>(null);

  const { data, isLoading, isError, refetch } = useUninvoicedEntries(
    { startDate, endDate, projectId: projectId ?? undefined },
    { enabled: open },
  );
  const entries = useMemo(() => data?.items ?? [], [data?.items]);

  const generate = useGenerateInvoiceFromTimesheets();

  const form = useForm<GenerateInvoiceFormValues>({
    resolver: zodResolver(generateInvoiceSchema),
    defaultValues: GENERATE_INVOICE_DEFAULTS,
  });

  const selectedEntries = useMemo(() => {
    if (selectedIds === null) return entries;
    const picked = new Set(selectedIds);
    return entries.filter((entry) => picked.has(entry.id));
  }, [entries, selectedIds]);
  const selectedEntryIds = useMemo(
    () => selectedEntries.map((entry) => entry.id),
    [selectedEntries],
  );

  const currency = selectedEntries[0]?.currency ?? entries[0]?.currency ?? "INR";
  const totalHours = selectedEntries.reduce(
    (sum, entry) => sum + Number(entry.hours),
    0,
  );
  const subtotal = selectedEntries.reduce(
    (sum, entry) => sum + entryAmount(entry),
    0,
  );
  const projectNames = [
    ...new Set(
      selectedEntries.map((entry) => entry.projectName ?? "Unassigned"),
    ),
  ];
  const projectName =
    projectNames.length === 1 ? projectNames[0] : `${projectNames.length} projects`;

  const handleToggle = useCallback(
    (entryId: number) => {
      setSelectedIds((current) => {
        const base = current ?? entries.map((entry) => entry.id);
        return base.includes(entryId)
          ? base.filter((id) => id !== entryId)
          : [...base, entryId];
      });
    },
    [entries],
  );

  const handleSelectAll = useCallback(() => setSelectedIds(null), []);

  const handleClearAll = useCallback(() => setSelectedIds([]), []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleContinue = useCallback(() => setStep("details"), []);
  const handleBack = useCallback(() => setStep("select"), []);
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleSubmit = useCallback(
    (values: GenerateInvoiceFormValues) => {
      generate.mutate(
        {
          timesheetEntryIds: selectedEntryIds,
          gstRate: Number(values.gstRate),
          discount: values.discount === "" ? 0 : Number(values.discount),
          dueDate: values.dueDate === "" ? undefined : values.dueDate,
          notes: values.notes === "" ? undefined : values.notes,
          status: values.status,
        },
        {
          onSuccess: (created) => {
            setResult(created);
            setStep("done");
            toast.success(`Invoice ${created.invoice.invoiceNumber} created`);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [generate, selectedEntryIds],
  );

  const footer = !canCreateInvoice ? (
    <Button type="button" variant="outline" className="w-full" onClick={handleClose}>
      Close
    </Button>
  ) : step === "select" ? (
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleContinue}
          disabled={selectedEntryIds.length === 0}
        >
          Continue
        </Button>
      </div>
    ) : step === "details" ? (
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={handleBack}>
          Back
        </Button>
        <LoadingButton
          type="submit"
          form="generate-invoice-form"
          isPending={generate.isPending}
          loadingText="Generating…"
          disabled={!canCreateInvoice || selectedEntryIds.length === 0}
        >
          Generate invoice
        </LoadingButton>
      </div>
    ) : (
      <Button type="button" variant="outline" className="w-full" onClick={handleClose}>
        Done
      </Button>
    );

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Generate invoice from approved time"
      description="Every line is priced from the timesheet entry it bills, and each entry is marked invoiced so it cannot be billed twice."
      footer={footer}
    >
      {!canCreateInvoice ? (
        <NoPermissionState compact permission="accounting:create" />
      ) : step === "select" ? (
        <InvoiceEntrySelection
          entries={entries}
          selectedIds={selectedEntryIds}
          currency={currency}
          isLoading={isLoading}
          isError={isError}
          onToggle={handleToggle}
          onSelectAll={handleSelectAll}
          onClearAll={handleClearAll}
          onRetry={handleRetry}
        />
      ) : step === "details" ? (
        <Form {...form}>
          <form
            id="generate-invoice-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            noValidate
          >
            <InvoiceDetailsFields
              form={form}
              entryCount={selectedEntries.length}
              totalHours={totalHours}
              subtotal={subtotal}
              currency={currency}
              projectName={projectName}
            />
          </form>
        </Form>
      ) : result !== null ? (
        <InvoiceCreatedSummary result={result} />
      ) : null}
    </AppSheet>
  );
}
