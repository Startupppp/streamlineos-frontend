"use client";

import { useState, useMemo } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  File,
  Loader2,
  CheckCircle2,
  Mail,
  CalendarIcon,
  AlertCircle,
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetBody,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import type { ExpenseFilters } from "@/types/hr/expenses";
import { useHrEmployees, unwrapEmployees } from "@/hooks/api/hr";
import type { Employee, PaginatedEmployees } from "@/types/hr";
import { usePdfRenderer, type PdfData } from "./pdf-renderer";
import { downloadCSV, downloadXLSX, type XlsxData } from "./xlsx-renderer";

type ExportPayload =
  | { format: "csv"; data: string; filename: string }
  | { format: "xlsx"; data: XlsxData; filename: string }
  | { format: "pdf"; data: PdfData; filename: string };

type ExportResult =
  | { success: false; error: string }
  | ({ success: true } & ExportPayload);

async function exportExpenses(params: {
  format: ExportFormat;
  filters: ExpenseFilters;
  includeHeader: boolean;
  includeTotals: boolean;
  title: string;
}): Promise<ExportResult> {
  try {
    const payload = await apiClient.post<ExportPayload>("/hr/expenses/export", params);
    if (payload.format === "csv") {
      return { success: true, format: "csv", data: payload.data, filename: payload.filename };
    }
    if (payload.format === "xlsx") {
      return { success: true, format: "xlsx", data: payload.data, filename: payload.filename };
    }
    return { success: true, format: "pdf", data: payload.data, filename: payload.filename };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

async function emailExpenseReport(
  filters: ExpenseFilters,
  emailTarget: "CEO" | "HR" | "BOTH",
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.post("/hr/expenses/email-report", { filters, emailTarget });
    return { success: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export interface ExpenseExportDialogProps {
  filters: ExpenseFilters;
  trigger?: React.ReactNode;
  categories?: { id: number; name: string }[];
  paymentMethods?: string[];
}

type ExportFormat = "csv" | "xlsx" | "pdf";

const FORMAT_OPTIONS: {
  value: ExportFormat;
  label: string;
  description: string;
  icon: typeof FileText;
}[] = [
  {
    value: "csv",
    label: "CSV",
    description:
      "Comma-separated values, compatible with Excel and Google Sheets",
    icon: File,
  },
  {
    value: "xlsx",
    label: "Excel (XLSX)",
    description: "Microsoft Excel format with multiple sheets and formatting",
    icon: FileSpreadsheet,
  },
];

const DEFAULT_PAYMENT_METHODS = [
  "Cash",
  "Bank Transfer",
  "UPI",
  "Credit Card",
  "Debit Card",
  "Cheque",
  "Other",
];

export function ExpenseExportDialog({
  filters,
  trigger,
  categories = [],
  paymentMethods = DEFAULT_PAYMENT_METHODS,
}: ExpenseExportDialogProps) {
  const [open, setOpen] = useState(false);

  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [includeHeader, setIncludeHeader] = useState(true);
  const [includeTotals, setIncludeTotals] = useState(true);

  const [isExporting, setIsExporting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const [emailTarget, setEmailTarget] = useState<"CEO" | "HR" | "BOTH">("BOTH");

  const [dateFrom, setDateFrom] = useState(filters.startDate || "");
  const [dateTo, setDateTo] = useState(filters.endDate || "");
  const [exportCategory, setExportCategory] = useState("all");
  const [exportPayment, setExportPayment] = useState("all");
  const [exportStatus, setExportStatus] = useState(
    filters.status && filters.status !== "all" ? String(filters.status) : "all",
  );
  const [exportUserId, setExportUserId] = useState(filters.userId || "all");

  const { data: employeesData } = useHrEmployees({ limit: 200 });
  const employees = useMemo<Employee[]>(() => {
    if (!employeesData) return [];
    if (Array.isArray(employeesData)) return employeesData as Employee[];
    return ((employeesData as PaginatedEmployees).data ?? []) as Employee[];
  }, [employeesData]);

  const dateFieldErrors = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const fromInFuture = dateFrom && dateFrom > today;
    const toInFuture = dateTo && dateTo > today;
    const rangeInvalid = dateFrom && dateTo && dateFrom > dateTo;
    const fromError = fromInFuture
      ? "From date cannot be in the future"
      : rangeInvalid
        ? "From date must be before To date"
        : null;
    const toError = toInFuture
      ? "To date cannot be in the future"
      : rangeInvalid
        ? "To date must be after From date"
        : null;
    return { from: fromError, to: toError };
  }, [dateFrom, dateTo]);

  const dateRangeError = dateFieldErrors.from ?? dateFieldErrors.to;

  const { downloadPDF, pdfPortal } = usePdfRenderer();

  const exportFilters: ExpenseFilters = {
    startDate: dateFrom || filters.startDate,
    endDate: dateTo || filters.endDate,
    month: filters.month,
    categoryId: filters.categoryId,
    category: exportCategory !== "all" ? exportCategory : filters.category,
    status: exportStatus !== "all" ? exportStatus : filters.status,
    userId: exportUserId !== "all" ? exportUserId : filters.userId,
    paymentMethod:
      exportPayment !== "all" ? exportPayment : filters.paymentMethod,
    minAmount: filters.minAmount,
    maxAmount: filters.maxAmount,
    search: filters.search,
  };

  const handleSendEmail = async () => {
    if (dateRangeError) {
      toast.error(dateRangeError);
      return;
    }
    setIsSendingEmail(true);
    try {
      const result = await emailExpenseReport(exportFilters, emailTarget);
      const targetLabel = emailTarget === "BOTH" ? "CEO & HR" : emailTarget;
      if (result.success) {
        toast.success(`Expense report emailed to ${targetLabel} successfully!`);
      } else {
        toast.error(result.error || "Failed to send email");
      }
    } catch {
      toast.error("Failed to send email");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleExport = async () => {
    if (dateRangeError) {
      toast.error(dateRangeError);
      return;
    }
    setIsExporting(true);
    setExportComplete(false);

    try {
      const result = await exportExpenses({
        format,
        filters: exportFilters,
        includeHeader,
        includeTotals,
        title: "Expense Report",
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      switch (result.format) {
        case "csv":
          downloadCSV(result.data, result.filename);
          break;
        case "xlsx":
          await downloadXLSX(result.data, result.filename);
          break;
        case "pdf":
          await downloadPDF(result.data, result.filename);
          break;
      }

      setExportComplete(true);
      toast.success("Export downloaded successfully!");
      setTimeout(() => {
        setOpen(false);
        setExportComplete(false);
      }, 1500);
    } catch {
      toast.error("Failed to export expenses");
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setFormat("xlsx");
      setIncludeHeader(true);
      setIncludeTotals(true);
      setExportComplete(false);
      setDateFrom(filters.startDate || "");
      setDateTo(filters.endDate || "");
      setExportCategory("all");
      setExportPayment("all");
      setExportStatus(
        filters.status && filters.status !== "all"
          ? String(filters.status)
          : "all",
      );
      setExportUserId(filters.userId || "all");
      setEmailTarget("BOTH");
    }
    setOpen(isOpen);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>
          {trigger || (
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
        </SheetTrigger>

        <SheetContent className="sm:max-w-lg p-0 flex flex-col gap-0">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle className="text-xl font-semibold flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Export Expenses
            </SheetTitle>
            <SheetDescription>
              Export your filtered expenses to your preferred format.
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="px-6 py-5">
          <div className="space-y-5">
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                Date Range
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground block">
                    From
                  </Label>
                  <DatePicker
                    value={dateFrom}
                    onChange={setDateFrom}
                    placeholder="From date"
                    toDate={new Date()}
                  />
                  {dateFieldErrors.from && (
                    <p className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle
                        className="h-3 w-3 shrink-0"
                        aria-hidden="true"
                      />
                      {dateFieldErrors.from}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground block">
                    To
                  </Label>
                  <DatePicker
                    value={dateTo}
                    onChange={setDateTo}
                    placeholder="To date"
                    toDate={new Date()}
                  />
                  {dateFieldErrors.to && (
                    <p className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle
                        className="h-3 w-3 shrink-0"
                        aria-hidden="true"
                      />
                      {dateFieldErrors.to}
                    </p>
                  )}
                </div>
              </div>
              {(dateFrom || dateTo) && !dateRangeError && (
                <button
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  Clear dates
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Status
                </Label>
                <Select value={exportStatus} onValueChange={setExportStatus}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Category
                </Label>
                <Select
                  value={exportCategory}
                  onValueChange={setExportCategory}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Payment
                </Label>
                <Select value={exportPayment} onValueChange={setExportPayment}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    {paymentMethods.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {employees.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Spent By
                </Label>
                <Select value={exportUserId} onValueChange={setExportUserId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees
                      .filter((e) => e.isActive)
                      .map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {[e.firstName, e.lastName]
                            .filter(Boolean)
                            .join(" ") || e.email}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-sm font-medium">Export Format</Label>
              <RadioGroup
                value={format}
                onValueChange={(v: string) => setFormat(v as ExportFormat)}
                className="grid gap-3"
              >
                {FORMAT_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                      format === option.value
                        ? "border-brand-core bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <RadioGroupItem value={option.value} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <option.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {option.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {option.description}
                      </p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Include Header</Label>
                  <p className="text-xs text-muted-foreground">
                    Add title, date, and filter information
                  </p>
                </div>
                <Switch
                  checked={includeHeader}
                  onCheckedChange={setIncludeHeader}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Include Totals</Label>
                  <p className="text-xs text-muted-foreground">
                    Add summary totals at the end
                  </p>
                </div>
                <Switch
                  checked={includeTotals}
                  onCheckedChange={setIncludeTotals}
                />
              </div>
            </div>

            {Object.values(exportFilters).some(
              (v) => v !== undefined && v !== "",
            ) && (
              <div className="p-4 bg-muted/30 rounded-lg border text-sm">
                <p className="font-medium text-sm mb-2">Applied Filters:</p>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  {exportFilters.startDate && (
                    <li>
                      Date: {exportFilters.startDate}
                      {exportFilters.endDate && ` to ${exportFilters.endDate}`}
                    </li>
                  )}
                  {exportFilters.status && exportFilters.status !== "all" && (
                    <li>Status: {exportFilters.status}</li>
                  )}
                  {exportFilters.category && (
                    <li>Category: {exportFilters.category}</li>
                  )}
                  {exportFilters.paymentMethod && (
                    <li>Payment: {exportFilters.paymentMethod}</li>
                  )}
                  {exportFilters.search && (
                    <li>Search: &ldquo;{exportFilters.search}&rdquo;</li>
                  )}
                </ul>
              </div>
            )}
          </div>
          </SheetBody>
          <SheetFooter className="shrink-0 px-6 py-4 border-t flex-col gap-3">
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={
                  isExporting ||
                  exportComplete ||
                  isSendingEmail ||
                  !!dateRangeError
                }
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
                    Export {format.toUpperCase()}
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={emailTarget}
                onValueChange={(v) =>
                  setEmailTarget(v as "CEO" | "HR" | "BOTH")
                }
              >
                <SelectTrigger className="w-[130px] text-xs shrink-0">
                  <Mail className="h-3.5 w-3.5 mr-1.5 text-primary" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CEO">CEO Only</SelectItem>
                  <SelectItem value="HR">HR Only</SelectItem>
                  <SelectItem value="BOTH">CEO & HR</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={handleSendEmail}
                disabled={isSendingEmail || isExporting || !!dateRangeError}
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
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {pdfPortal}
    </>
  );
}
