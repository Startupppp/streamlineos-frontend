"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { exportSchema, type ExportFormValues } from "./payroll-export-schema";
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useCreateTimesheetPayrollExport } from "@/hooks/api/timesheets/payroll";
import {
  applyMapping,
  downloadPayrollFile,
  summaryRowToExportRow,
} from "./lib/build-payroll-file";
import type { PayrollSummaryRow, PayrollMapping, ExportFormat } from "./types";

interface PayrollExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  start: string;
  end: string;
  allRows: PayrollSummaryRow[];
  selectedUserIds: Set<string>;
  mapping: PayrollMapping;
}

interface PreviewRow {
  rowIndex: number;
  cells: (string | number)[];
}

function buildPreviewColumns(
  enabledCols: PayrollMapping["columns"],
): DataTableColumn<PreviewRow>[] {
  return enabledCols.map((col, index) => ({
    key: col.key,
    header: col.header,
    headerClassName: "text-micro py-1 px-2 font-bold uppercase tracking-wider",
    className: "text-dense py-1 px-2 font-mono",
    cell: (row) => row.cells[index] ?? "",
  }));
}

export function PayrollExportDialog({
  open,
  onOpenChange,
  start,
  end,
  allRows,
  selectedUserIds,
  mapping,
}: PayrollExportDialogProps) {
  const createExport = useCreateTimesheetPayrollExport();

  const form = useForm<ExportFormValues>({
    resolver: zodResolver(exportSchema),
    defaultValues: { format: "CSV", includeExported: false, note: "" },
  });

  const exportFormat = form.watch("format");
  const includeExported = form.watch("includeExported");

  const targetRows =
    selectedUserIds.size > 0
      ? allRows.filter((r) => selectedUserIds.has(r.userId))
      : allRows;

  const previewRowCount = Math.min(6, targetRows.length);
  const enabledCols = mapping.columns.filter((c) => c.enabled).slice(0, 6);

  const handleClose = useCallback(() => {
    form.reset();
    onOpenChange(false);
  }, [form, onOpenChange]);

  const handleFormatChange = useCallback(
    (value: string) => form.setValue("format", value as ExportFormat),
    [form],
  );

  const handleIncludeExportedChange = useCallback(
    (checked: boolean) => form.setValue("includeExported", checked),
    [form],
  );

  const onValidSubmit = useCallback(
    async (values: ExportFormValues) => {
      const body = {
        start,
        end,
        format: values.format,
        includeExported: values.includeExported,
        note: values.note || undefined,
        userIds: selectedUserIds.size > 0 ? [...selectedUserIds] : undefined,
      };
      createExport.mutate(body, {
        onSuccess: (result) => {
          const { headers, matrix } = applyMapping(result.rows, mapping);
          const filename = `payroll-export_${start}_${end}.${values.format.toLowerCase()}`;
          void downloadPayrollFile(values.format, filename, headers, matrix);
          toast.success(`Exported ${result.export.entryCount} entries · ${result.export.totalHours.toFixed(1)} h`);
          handleClose();
        },
      });
    },
    [start, end, selectedUserIds, createExport, mapping, handleClose],
  );

  const handleSubmit = form.handleSubmit(onValidSubmit);

  const preview = applyMapping(
    targetRows.slice(0, previewRowCount).map((row) => summaryRowToExportRow(row, start, end)),
    { ...mapping, columns: enabledCols },
  );

  const previewColumns = buildPreviewColumns(enabledCols);
  const previewData: PreviewRow[] = preview.matrix.map((cells, rowIndex) => ({ rowIndex, cells }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export Payroll</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Format</Label>
            <RadioGroup
              value={exportFormat}
              onValueChange={handleFormatChange}
              className="flex gap-4"
            >
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="CSV" id="fmt-csv" />
                <Label htmlFor="fmt-csv" className="text-xs cursor-pointer">CSV</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="XLSX" id="fmt-xlsx" />
                <Label htmlFor="fmt-xlsx" className="text-xs cursor-pointer">XLSX</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="include-exported-exp"
              checked={includeExported}
              onCheckedChange={handleIncludeExportedChange}
            />
            <Label htmlFor="include-exported-exp" className="text-xs cursor-pointer">
              Include previously exported entries
            </Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="export-note" className="text-xs font-medium">Note (optional)</Label>
            <Input
              id="export-note"
              placeholder="e.g. June 2026 payroll"
              {...form.register("note")}
            />
            {form.formState.errors.note && <p className="text-xs text-destructive">{form.formState.errors.note.message}</p>}
          </div>

          <div className="space-y-1.5">
            <p className="text-dense font-medium text-muted-foreground uppercase tracking-wider">
              Preview ({targetRows.length} people)
            </p>
            <div className="max-h-[160px] overflow-auto">
              <DataTable
                data={previewData}
                columns={previewColumns}
                getRowKey={(row) => row.rowIndex}
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
              isPending={createExport.isPending}
              disabled={createExport.isPending || targetRows.length === 0}
              loadingText="Exporting…"
            >
              Export {targetRows.length} people
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
