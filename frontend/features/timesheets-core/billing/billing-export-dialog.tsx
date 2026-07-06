"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBillingExport } from "@/hooks/api/timesheets-core/billing";
import { downloadBillingFile } from "./lib/build-billing-file";
import type { BillingGroup } from "@/features/timesheets-core/types";

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

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function BillingExportDialog({
  open,
  onOpenChange,
  startDate,
  endDate,
  groups,
  projectId,
}: BillingExportDialogProps) {
  const billingExport = useBillingExport();

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
      { startDate, endDate, format: values.format, projectId: projectId ?? undefined },
      {
        onSuccess: (result) => {
          const filename = `billing-export_${startDate}_${endDate}.${values.format.toLowerCase()}`;
          void downloadBillingFile(values.format, filename, groups);
          toast.success(
            `Exported ${result.entryCount} entries · ${result.totalHours.toFixed(1)} h · ${formatMoney(result.totalAmount, fallbackCurrency)}`,
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
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Preview ({groups.length} project{groups.length !== 1 ? "s" : ""})
            </p>
            <div className="rounded-md border border-border overflow-auto max-h-[160px]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10px] py-1 px-2 font-bold uppercase tracking-wider">Project</TableHead>
                    <TableHead className="text-[10px] py-1 px-2 font-bold uppercase tracking-wider text-right">Hours</TableHead>
                    <TableHead className="text-[10px] py-1 px-2 font-bold uppercase tracking-wider text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewGroups.map((g) => (
                    <TableRow key={g.projectId ?? g.projectName} className="h-7 hover:bg-transparent">
                      <TableCell className="text-[11px] py-1 px-2 truncate max-w-[160px]">{g.projectName}</TableCell>
                      <TableCell className="text-[11px] py-1 px-2 font-mono text-right">{g.totalHours.toFixed(1)}</TableCell>
                      <TableCell className="text-[11px] py-1 px-2 font-mono text-right">
                        {formatMoney(g.billableAmount, g.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="grid grid-cols-2 gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-8 text-xs"
              disabled={billingExport.isPending || groups.length === 0}
            >
              {billingExport.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Export {groups.length} project{groups.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
