"use client";

import { useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useBillingExport } from "@/hooks/api/timesheets-core/billing";
import { downloadBillingFile } from "./lib/build-billing-file";
import { formatCurrencyForBilling } from "@/lib/format-utils";
import type { BillingGroup } from "@/features/timesheets/types";

const exportSchema = z.object({ format: z.enum(["CSV", "XLSX"]) });

type ExportFormValues = z.infer<typeof exportSchema>;

interface BillingExportDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  startDate: string;
  endDate: string;
  groups: BillingGroup[];
  projectId: number | null;
}

const billingPreviewColumns: DataTableColumn<BillingGroup>[] = [
  {
    key: "projectName",
    header: "Project",
    headerClassName: "text-micro py-1 px-2 font-bold uppercase tracking-wider",
    className: "text-dense py-1 px-2 truncate max-w-[160px]",
    cell: (row) => row.projectName,
  },
  {
    key: "totalHours",
    header: "Hours",
    headerClassName: "text-micro py-1 px-2 font-bold uppercase tracking-wider text-right",
    className: "text-dense py-1 px-2 font-mono text-right",
    cell: (row) => row.totalHours.toFixed(1),
  },
  {
    key: "billableAmount",
    header: "Amount",
    headerClassName: "text-micro py-1 px-2 font-bold uppercase tracking-wider text-right",
    className: "text-dense py-1 px-2 font-mono text-right",
    cell: (row) => formatCurrencyForBilling(row.billableAmount, row.currency),
  },
];

export function BillingExportDialog({
  open,
  onOpenChange,
  startDate,
  endDate,
  groups,
  projectId,
}: BillingExportDialogProps) {
  const billingExport = useBillingExport();

  const idempotencyKey = useMemo(
    () => (open ? crypto.randomUUID() : ""),
    [open],
  );

  const form = useForm<ExportFormValues>({
    resolver: zodResolver(exportSchema),
    defaultValues: { format: "CSV" },
  });

  const exportFormat = form.watch("format");
  const previewGroups = groups.slice(0, 5);
  const fallbackCurrency = groups[0]?.currency ?? "USD";

  const handleClose = useCallback(() => {
    form.reset();
    onOpenChange(false);
  }, [form, onOpenChange]);

  const handleFormatChange = useCallback(
    (value: string) => form.setValue("format", value as "CSV" | "XLSX"),
    [form],
  );

  const handleSubmit = form.handleSubmit((values) => {
    billingExport.mutate(
      {
        startDate,
        endDate,
        format: values.format,
        projectId: projectId ?? undefined,
        idempotencyKey: idempotencyKey || undefined,
      },
      {
        onSuccess: (result) => {
          const filename = `billing-export_${startDate}_${endDate}.${values.format.toLowerCase()}`;
          void downloadBillingFile(values.format, filename, groups);
          toast.success(
            `Exported ${result.entryCount} entries · ${result.totalHours.toFixed(1)} h · ${formatCurrencyForBilling(result.totalAmount, fallbackCurrency)}`,
          );
          handleClose();
        },
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Billing</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Format</Label>
            <RadioGroup value={exportFormat} onValueChange={handleFormatChange} className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="CSV" id="bill-fmt-csv" />
                <Label htmlFor="bill-fmt-csv" className="text-xs cursor-pointer">CSV</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="XLSX" id="bill-fmt-xlsx" />
                <Label htmlFor="bill-fmt-xlsx" className="text-xs cursor-pointer">XLSX</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-1.5">
            <p className="text-dense font-medium text-muted-foreground uppercase tracking-wider">
              Preview ({groups.length} project{groups.length !== 1 ? "s" : ""})
            </p>
            <div className="max-h-[160px] overflow-auto">
              <DataTable
                data={previewGroups}
                columns={billingPreviewColumns}
                getRowKey={(row) => row.projectId ?? row.projectName}
              />
            </div>
          </div>

          <DialogFooter className="grid grid-cols-2 gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              isPending={billingExport.isPending}
              disabled={billingExport.isPending || groups.length === 0}
              loadingText="Exporting…"
            >
              Export {groups.length} project{groups.length !== 1 ? "s" : ""}
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
