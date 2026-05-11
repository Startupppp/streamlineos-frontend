"use client";

import { useState } from "react";
import {
  Download,
  FileSpreadsheet,
  File as FileIcon,
  Loader2,
  CheckCircle2,
  Mail,
  Layers,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

type ExportFormat = "csv" | "xlsx";

const FORMAT_OPTIONS: {
  value: ExportFormat;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    value: "csv",
    label: "CSV",
    description: "Comma-separated values — works in Excel, Sheets, and CRM tools",
    icon: FileIcon,
  },
  {
    value: "xlsx",
    label: "Excel (XLSX)",
    description: "Formatted spreadsheet with columns sized for printing",
    icon: FileSpreadsheet,
  },
];

export type AssetEmailRecipients = "CEO" | "HR" | "BOTH";

export interface AssetExportSheetProps {
  /** Matches Assets tabs — drives export scope */
  statusFilter: string | undefined;
  onStatusFilterChange: (v: string | undefined) => void;
  rowCount: number;
  onExportCsv: () => void;
  onExportXlsx: () => void | Promise<void>;
  onSendEmail: (payload: {
    format: ExportFormat;
    recipients: AssetEmailRecipients;
  }) => void;
  isSendingEmail: boolean;
}

export function AssetExportSheet({
  statusFilter,
  onStatusFilterChange,
  rowCount,
  onExportCsv,
  onExportXlsx,
  onSendEmail,
  isSendingEmail,
}: AssetExportSheetProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [emailTarget, setEmailTarget] = useState<AssetEmailRecipients>("BOTH");
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const statusLabel =
    statusFilter === "AVAILABLE"
      ? "Available"
      : statusFilter === "ASSIGNED"
        ? "Assigned"
        : statusFilter === "MAINTENANCE"
          ? "Maintenance"
          : statusFilter === "RETIRED"
            ? "Retired"
            : "All statuses";

  const handleDownload = async () => {
    setIsExporting(true);
    setExportComplete(false);
    try {
      if (format === "csv") {
        onExportCsv();
      } else {
        await onExportXlsx();
      }
      setExportComplete(true);
      toast.success("Export downloaded successfully!");
      setTimeout(() => {
        setOpen(false);
        setExportComplete(false);
      }, 1400);
    } catch {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendEmail = () => {
    if (rowCount === 0) {
      toast.error("No assets in the current view to export.");
      return;
    }
    onSendEmail({ format, recipients: emailTarget });
  };

  const emailLabel =
    emailTarget === "BOTH" ? "CEO & HR" : emailTarget === "CEO" ? "CEO" : "HR";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" type="button" className="gap-2">
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </SheetTrigger>

      <SheetContent className="sm:max-w-lg overflow-y-auto p-6">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl font-semibold flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Export assets
          </SheetTitle>
          <SheetDescription>
            Download a file or email the same export to leadership — same options as Expenses.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              Inventory scope
            </Label>
            <Select
              value={statusFilter ?? "all"}
              onValueChange={(v) => onStatusFilterChange(v === "all" ? undefined : v)}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="All assets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assets</SelectItem>
                <SelectItem value="AVAILABLE">Available</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                <SelectItem value="RETIRED">Retired</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Uses the same filter as the table tabs — <strong>{rowCount}</strong> row
              {rowCount === 1 ? "" : "s"} in this view.
            </p>
          </div>

          <div className="p-4 bg-muted/30 rounded-lg border text-sm">
            <p className="font-medium text-sm mb-1">Current view</p>
            <ul className="text-muted-foreground space-y-1 text-xs">
              <li>Status: {statusLabel}</li>
              <li>Rows: {rowCount}</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Export format</Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as ExportFormat)}
              className="grid gap-3"
            >
              {FORMAT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                    format === option.value ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <RadioGroupItem value={option.value} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{option.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-6 mt-4 border-t">
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleDownload()}
              disabled={isExporting || exportComplete || isSendingEmail || rowCount === 0}
              className="gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : exportComplete ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Done!
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download {format === "csv" ? "CSV" : "Excel"}
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={emailTarget}
              onValueChange={(v) => setEmailTarget(v as AssetEmailRecipients)}
            >
              <SelectTrigger className="h-9 w-[140px] text-xs shrink-0">
                <Mail className="h-3.5 w-3.5 mr-1.5 text-primary" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CEO">CEO only</SelectItem>
                <SelectItem value="HR">HR only</SelectItem>
                <SelectItem value="BOTH">CEO &amp; HR</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={handleSendEmail}
              disabled={isSendingEmail || isExporting || rowCount === 0}
              className="flex-1 gap-2 border-primary/30 text-primary hover:bg-primary/5"
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Send email ({emailLabel})
                </>
              )}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Sends {format === "csv" ? "CSV" : "Excel"} as an attachment to active users with the selected role in your organization.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
