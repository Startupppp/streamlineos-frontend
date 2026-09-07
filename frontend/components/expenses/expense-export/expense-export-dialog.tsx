"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Loader2, Mail } from "lucide-react";
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
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";

const expenseEmailReportContract = lazyContract(() =>
  import("@/components/expenses/expense-export/expense-export-schema").then(
    (m) => m.expenseExportJobContract,
  ),
);
import type { ExpenseFilters } from "@/types/hr/expenses";
import {
  useCreateExpenseExportJob,
  useExpenseExportJob,
  useDownloadExpenseExportJob,
} from "@/hooks/api/hr/expenses";
import { ExpenseExportOptions } from "./expense-export-options";

type ExpenseReportEmailTarget = "ADMINS" | "APPROVERS" | "BOTH";

function isExpenseReportEmailTarget(value: string): value is ExpenseReportEmailTarget {
  return value === "ADMINS" || value === "APPROVERS" || value === "BOTH";
}

async function emailExpenseReport(
  filters: ExpenseFilters,
  sendTo: ExpenseReportEmailTarget,
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.post("/hr/expenses/email-report", { filters, sendTo }, undefined, expenseEmailReportContract);
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export interface ExpenseExportDialogProps {
  filters: ExpenseFilters;
  trigger?: React.ReactNode;
}

export function ExpenseExportDialog({
  filters,
  trigger,
}: ExpenseExportDialogProps) {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailTarget, setEmailTarget] = useState<ExpenseReportEmailTarget>("BOTH");
  const [dateFrom, setDateFrom] = useState(filters.startDate ?? "");
  const [dateTo, setDateTo] = useState(filters.endDate ?? "");
  const [exportStatus, setExportStatus] = useState(
    filters.status && filters.status !== "all" ? String(filters.status) : "all",
  );
  const [jobId, setJobId] = useState<string | null>(null);
  const [hasTriggeredDownload, setHasTriggeredDownload] = useState(false);

  const createJob = useCreateExpenseExportJob();
  const { data: job } = useExpenseExportJob(jobId);
  const downloadJob = useDownloadExpenseExportJob();

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

  const isProcessing =
    createJob.isPending || job?.status === "pending" || job?.status === "running";
  const isCompleted = job?.status === "completed" && !hasTriggeredDownload;
  const isFailed = job?.status === "failed";

  function handleReset() {
    setJobId(null);
    setHasTriggeredDownload(false);
    createJob.reset();
    downloadJob.reset();
  }

  function handleExport() {
    if (dateRangeError) {
      toast.error(dateRangeError);
      return;
    }
    handleReset();
    const idempotencyKey = `expense-export-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    createJob.mutate(
      {
        input: {
          ...(exportStatus !== "all" ? { status: exportStatus } : {}),
          ...(dateFrom ? { startDate: dateFrom } : {}),
          ...(dateTo ? { endDate: dateTo } : {}),
        },
        idempotencyKey,
      },
      {
        onSuccess: (created) => {
          setJobId(created.id);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }

  function handleDownload() {
    if (!job?.id) return;
    setHasTriggeredDownload(true);
    downloadJob.mutate(job.id, {
      onSuccess: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = job.fileName ?? "expenses.csv";
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Export downloaded successfully!");
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        closeTimerRef.current = setTimeout(() => {
          setOpen(false);
          handleReset();
        }, 1500);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setHasTriggeredDownload(false);
      },
    });
  }

  async function handleSendEmail() {
    if (dateRangeError) {
      toast.error(dateRangeError);
      return;
    }
    setIsSendingEmail(true);
    try {
      const emailFilters: ExpenseFilters = {
        startDate: dateFrom || filters.startDate,
        endDate: dateTo || filters.endDate,
        status: exportStatus !== "all" ? exportStatus : filters.status,
      };
      const result = await emailExpenseReport(emailFilters, emailTarget);
      const targetLabel =
        emailTarget === "BOTH" ? "Admins & Approvers" : emailTarget;
      if (result.success)
        toast.success(`Expense report emailed to ${targetLabel} successfully!`);
      else toast.error(result.error ?? "Failed to send email");
    } catch {
      toast.error("Failed to send email");
    } finally {
      setIsSendingEmail(false);
    }
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      handleReset();
      setDateFrom(filters.startDate ?? "");
      setDateTo(filters.endDate ?? "");
      setExportStatus(
        filters.status && filters.status !== "all"
          ? String(filters.status)
          : "all",
      );
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

  const exportLabel = isProcessing
    ? "Processing…"
    : isCompleted
      ? "Download Ready"
      : "Export CSV";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>
          {trigger ?? (
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
              Export your filtered expenses to CSV.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="px-6 py-5">
            <ExpenseExportOptions
              dateFrom={dateFrom}
              dateTo={dateTo}
              dateFromError={dateFieldErrors.from}
              dateToError={dateFieldErrors.to}
              exportStatus={exportStatus}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              onStatusChange={setExportStatus}
            />
            {isFailed && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {job?.errorMessage ?? "Export failed. Please try again."}
                </span>
              </div>
            )}
            {job?.truncated && job.status === "completed" && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-status-warning-rule bg-status-warning-surface p-3 text-sm text-status-warning-ink-strong">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  The export was capped at {job.rowCount?.toLocaleString()} rows.
                  Narrow your date range or status filter to export all records.
                </span>
              </div>
            )}
          </SheetBody>
          <SheetFooter className="shrink-0 flex-col gap-3 border-t px-6 py-4">
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              {isCompleted ? (
                <Button onClick={handleDownload} disabled={downloadJob.isPending} className="gap-2">
                  {downloadJob.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Downloading…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Download CSV
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleExport}
                  disabled={isProcessing || !!dateRangeError}
                  className="gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {exportLabel}
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      {exportLabel}
                    </>
                  )}
                </Button>
              )}
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
                disabled={isSendingEmail || isProcessing || !!dateRangeError}
                className="flex-1 gap-2 border-primary/30 text-primary hover:bg-primary/5"
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
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
  );
}
