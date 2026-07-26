"use client";

import { useCallback, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAckPayrollExport } from "@/hooks/api/timesheets/payroll";
import {
  ackExportSchema,
  type AckExportInput,
  type AckStatus,
} from "./ack-export-schema";
import { ACK_STATUS_LABEL, isAckStatus, type TimesheetExportDto } from "./types";

const ACK_STATUS_OPTIONS: AckStatus[] = [
  "RECEIVED",
  "ACCEPTED",
  "REJECTED",
  "FAILED",
];

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

  const { control, handleSubmit, register, reset, formState: { errors } } =
    useForm<AckExportInput>({
      resolver: zodResolver(ackExportSchema),
      defaultValues: { status: "RECEIVED", note: "" },
    });

  useEffect(() => {
    if (!open) return;
    reset({
      status:
        exportRow.ackStatus && isAckStatus(exportRow.ackStatus)
          ? exportRow.ackStatus
          : "RECEIVED",
      note: "",
    });
  }, [open, exportRow, reset]);

  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleSave = handleSubmit((values) => {
    const note = values.note?.trim();
    ackExport.mutate(
      {
        exportId: exportRow.id,
        data: { status: values.status, note: note ? note : undefined },
      },
      { onSuccess: handleClose },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Record acknowledgement</DialogTitle>
          <DialogDescription className="text-xs">
            Log the payroll provider&apos;s response for the export covering{" "}
            {formatPeriodDate(exportRow.dateRangeStart)} –{" "}
            {formatPeriodDate(exportRow.dateRangeEnd)}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                    {ACK_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status} className="text-xs">
                        {ACK_STATUS_LABEL[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Note</Label>
            <Textarea
              rows={3}
              placeholder="Optional context, e.g. provider batch reference"
              className="text-sm"
              {...register("note")}
            />
            {errors.note && (
              <p className="text-xs text-destructive">{errors.note.message}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={ackExport.isPending}
            >
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              size="sm"
              isPending={ackExport.isPending}
              loadingText="Saving…"
            >
              Save acknowledgement
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
