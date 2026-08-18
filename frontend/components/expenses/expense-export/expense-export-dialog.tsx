"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Download, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { unwrapEmployees, useHrEmployees } from "@/hooks/api/hr";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Employee } from "@/types/hr";
import type { ExpenseFilters } from "@/types/hr/expenses";
import {
  ExpenseExportOptions,
  type ExpenseExportFormat,
} from "./expense-export-options";
import { usePdfRenderer, type PdfData } from "./pdf-renderer";
import { downloadCSV, downloadXLSX, type XlsxData } from "./xlsx-renderer";

type ExportPayload =
  | { format: "csv"; data: string; filename: string }
  | { format: "xlsx"; data: XlsxData; filename: string }
  | { format: "pdf"; data: PdfData; filename: string };

type ExportResult =
  | { success: false; error: string }
  | ({ success: true } & ExportPayload);

type ExpenseReportEmailTarget = "ADMINS" | "APPROVERS" | "BOTH";

async function exportExpenses(params: {
  format: ExpenseExportFormat;
  filters: ExpenseFilters;
  includeHeader: boolean;
  includeTotals: boolean;
  title: string;
}): Promise<ExportResult> {
  try {
    const payload = await apiClient.post<ExportPayload>("/hr/expenses/export", params);
    if (payload.format === "csv")
      return { success: true, format: "csv", data: payload.data, filename: payload.filename };
    if (payload.format === "xlsx")
      return { success: true, format: "xlsx", data: payload.data, filename: payload.filename };
    return { success: true, format: "pdf", data: payload.data, filename: payload.filename };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

async function emailExpenseReport(
  filters: ExpenseFilters,
  emailTarget: ExpenseReportEmailTarget,
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.post("/hr/expenses/email-report", { filters, emailTarget });
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

function isExpenseReportEmailTarget(value: string): value is ExpenseReportEmailTarget {
  return value === "ADMINS" || value === "APPROVERS" || value === "BOTH";
}

export interface ExpenseExportDialogProps {
  filters: ExpenseFilters;
  trigger?: React.ReactNode;
  categories?: Array<{ id: number; name: string }>;
  paymentMethods?: string[];
}

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
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [format, setFormat] = useState<ExpenseExportFormat>("xlsx");
  const [includeHeader, setIncludeHeader] = useState(true);
  const [includeTotals, setIncludeTotals] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [emailTarget, setEmailTarget] = useState<ExpenseReportEmailTarget>("BOTH");
  const [dateFrom, setDateFrom] = useState(filters.startDate || "");
  const [dateTo, setDateTo] = useState(filters.endDate || "");
  const [exportCategory, setExportCategory] = useState("all");
  const [exportPayment, setExportPayment] = useState("all");
  const [exportStatus, setExportStatus] = useState(
    filters.status && filters.status !== "all" ? String(filters.status) : "all",
  );
  const [exportUserId, setExportUserId] = useState(filters.userId || "all");

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const { data: employeesData } = useHrEmployees({ limit: 100 });
  const employees = useMemo<Employee[]>(
    () => unwrapEmployees(employeesData),
    [employeesData],
  );

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
    paymentMethod: exportPayment !== "all" ? exportPayment : filters.paymentMethod,
    minAmount: filters.minAmount,
    maxAmount: filters.maxAmount,
    search: filters.search,
  };

  async function handleSendEmail() {
    if (dateRangeError) {
      toast.error(dateRangeError);
      return;
    }
    setIsSendingEmail(true);
    try {
      const result = await emailExpenseReport(exportFilters, emailTarget);
      const targetLabel = emailTarget === "BOTH" ? "Admins & Approvers" : emailTarget;
      if (result.success)
        toast.success(`Expense report emailed to ${targetLabel} successfully!`);
      else toast.error(result.error || "Failed to send email");
    } catch {
      toast.error("Failed to send email");
    } finally {
      setIsSendingEmail(false);
    }
  }

  async function handleExport() {
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
      if (result.format === "csv") downloadCSV(result.data, result.filename);
      else if (result.format === "xlsx") await downloadXLSX(result.data, result.filename);
      else await downloadPDF(result.data, result.filename);
      setExportComplete(true);
      toast.success("Export downloaded successfully!");
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      closeTimerRef.current = setTimeout(() => {
        setOpen(false);
        setExportComplete(false);
      }, 1500);
    } catch {
      toast.error("Failed to export expenses");
    } finally {
      setIsExporting(false);
    }
  }

  function handleOpenChange(isOpen: boolean) {
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
        filters.status && filters.status !== "all" ? String(filters.status) : "all",
      );
      setExportUserId(filters.userId || "all");
      setEmailTarget("BOTH");
    }
    setOpen(isOpen);
  }

  function handleEmailTargetChange(value: string) {
    if (isExpenseReportEmailTarget(value)) setEmailTarget(value);
  }

  function handleCancel() {
    setOpen(false);
  }

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
        <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 gap-1 border-b px-6 py-4 text-left">
            <SheetTitle className="flex items-center gap-2 text-xl font-semibold">
              <Download className="h-5 w-5 text-primary" />
              Export Expenses
            </SheetTitle>
            <SheetDescription>
              Export your filtered expenses to your preferred format.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="px-6 py-5">
            <ExpenseExportOptions
              dateFrom={dateFrom}
              dateTo={dateTo}
              dateFromError={dateFieldErrors.from}
              dateToError={dateFieldErrors.to}
              exportStatus={exportStatus}
              exportCategory={exportCategory}
              exportPayment={exportPayment}
              exportUserId={exportUserId}
              format={format}
              includeHeader={includeHeader}
              includeTotals={includeTotals}
              categories={categories}
              paymentMethods={paymentMethods}
              employees={employees}
              exportFilters={exportFilters}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              onStatusChange={setExportStatus}
              onCategoryChange={setExportCategory}
              onPaymentChange={setExportPayment}
              onUserChange={setExportUserId}
              onFormatChange={setFormat}
              onIncludeHeaderChange={setIncludeHeader}
              onIncludeTotalsChange={setIncludeTotals}
            />
          </SheetBody>
          <SheetFooter className="shrink-0 flex-col gap-3 border-t px-6 py-4">
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={isExporting || exportComplete || isSendingEmail || !!dateRangeError}
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
              <Select value={emailTarget} onValueChange={handleEmailTargetChange}>
                <SelectTrigger className="w-[130px] shrink-0">
                  <Mail className="mr-1.5 h-3.5 w-3.5 text-primary" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMINS">Admins Only</SelectItem>
                  <SelectItem value="APPROVERS">Approvers Only</SelectItem>
                  <SelectItem value="BOTH">Admins &amp; Approvers</SelectItem>
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
