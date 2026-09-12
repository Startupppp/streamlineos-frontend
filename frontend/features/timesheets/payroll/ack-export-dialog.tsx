"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { EntityFormDialog } from "@/components/shared";
import { useAckPayrollExport } from "@/hooks/api/timesheets/payroll";
import { ackExportSchema, legalAckStatuses, type AckExportInput } from "./ack-export-schema";
import { AckExportFormFields } from "./ack-export-form-fields";
import type { TimesheetExportDto } from "./types";

function formatPeriodDate(value: string): string {
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

interface AckExportDialogProps {
  exportRow: TimesheetExportDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AckExportDialog({ exportRow, open, onOpenChange }: AckExportDialogProps) {
  const ackExport = useAckPayrollExport();
  const statuses = legalAckStatuses(exportRow.ackStatus);
  const firstStatus = statuses[0];

  function handleClose() {
    onOpenChange(false);
  }

  function handleSubmit(values: AckExportInput) {
    const note = values.note?.trim();
    ackExport.mutate(
      { exportId: exportRow.id, data: { status: values.status, note: note ? note : undefined } },
      { onSuccess: handleClose },
    );
  }

  if (!firstStatus) return null;

  return (
    <EntityFormDialog<AckExportInput>
      open={open}
      onOpenChange={onOpenChange}
      title="Record acknowledgement"
      description={`Log the payroll provider's response for the export covering ${formatPeriodDate(exportRow.dateRangeStart)} – ${formatPeriodDate(exportRow.dateRangeEnd)}.`}
      resolver={zodResolver(ackExportSchema)}
      defaultValues={{ status: firstStatus, note: "" }}
      onSubmit={handleSubmit}
      isSubmitting={ackExport.isPending}
      submitLabel="Save acknowledgement"
      className="sm:max-w-md"
    >
      {(form) => <AckExportFormFields form={form} statuses={statuses} />}
    </EntityFormDialog>
  );
}
