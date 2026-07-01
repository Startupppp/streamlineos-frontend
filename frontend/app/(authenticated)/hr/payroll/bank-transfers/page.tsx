"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Download,
  Building2,
  AlertCircle,
} from "lucide-react";
import { format, parse } from "date-fns";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getErrorMessage } from "@/lib/api-client";
import {
  useBankTransfers,
  useCreateBankTransfer,
  useUpdateBankTransfer,
  useGenerateBankFile,
  type BankTransfer,
  type BankTransferStatus,
} from "@/hooks/api/hr/bank-transfers";

const STATUS_CONFIG: Record<
  BankTransferStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  PROCESSING: {
    label: "Processing",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  FAILED: {
    label: "Failed",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

function formatInr(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatMonth(month: string): string {
  try {
    return format(parse(month, "yyyy-MM", new Date()), "MMMM yyyy");
  } catch {
    return month;
  }
}

const ENTRY_STATUS_DOT: Record<string, string> = {
  PENDING: "bg-amber-400",
  COMPLETED: "bg-green-500",
  FAILED: "bg-red-500",
};

interface TransferCardProps {
  transfer: BankTransfer;
  isExpanded: boolean;
  onToggleExpand: (id: number) => void;
  onUpdateStatus: (id: number, status: string, referenceNo?: string) => void;
  onGenerateFile: (id: number) => void;
  isUpdating: boolean;
  isGenerating: boolean;
  idx: number;
}

function TransferCard({
  transfer,
  isExpanded,
  onToggleExpand,
  onUpdateStatus,
  onGenerateFile,
  isUpdating,
  isGenerating,
  idx,
}: TransferCardProps) {
  const statusCfg = STATUS_CONFIG[transfer.status] ?? STATUS_CONFIG.PENDING;

  function handleToggle() {
    onToggleExpand(transfer.id);
  }

  function handleMarkProcessing() {
    onUpdateStatus(transfer.id, "PROCESSING");
  }

  function handleMarkCompleted() {
    onUpdateStatus(transfer.id, "COMPLETED");
  }

  function handleMarkFailed() {
    onUpdateStatus(transfer.id, "FAILED");
  }

  function handleGenerateFile() {
    onGenerateFile(transfer.id);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut", delay: idx * 0.08 }}
      className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 overflow-hidden"
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">
                {formatMonth(transfer.month)}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusCfg.className}`}
              >
                {statusCfg.label}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="text-base font-bold text-foreground tabular-nums">
                {formatInr(transfer.totalAmount)}
              </span>
              <span className="text-xs text-muted-foreground">
                {transfer.employeeCount}{" "}
                {transfer.employeeCount === 1 ? "employee" : "employees"}
              </span>
              {transfer.referenceNo && (
                <span className="text-xs text-muted-foreground">
                  Ref:{" "}
                  <span className="font-medium text-foreground">
                    {transfer.referenceNo}
                  </span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={handleGenerateFile}
              disabled={isGenerating}
            >
              <Download className="h-3 w-3" />
              NEFT File
            </Button>

            {transfer.status === "PENDING" && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={handleMarkProcessing}
                disabled={isUpdating}
              >
                Mark Processing
              </Button>
            )}

            {transfer.status === "PROCESSING" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-green-200 text-green-700 hover:bg-green-50"
                  onClick={handleMarkCompleted}
                  disabled={isUpdating}
                >
                  Mark Completed
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-red-200 text-red-700 hover:bg-red-50"
                  onClick={handleMarkFailed}
                  disabled={isUpdating}
                >
                  Mark Failed
                </Button>
              </>
            )}

            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-muted-foreground"
              onClick={handleToggle}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden border-t border-slate-100"
          >
            <div className="px-4 sm:px-5 py-3">
              {transfer.entries.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No employee entries recorded yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs h-8">Employee</TableHead>
                      <TableHead className="text-xs h-8">Bank Account</TableHead>
                      <TableHead className="text-xs h-8 text-right">
                        Amount
                      </TableHead>
                      <TableHead className="text-xs h-8 text-center">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfer.entries.map((entry, i) => (
                      <TableRow key={`${entry.userId}-${i}`} className="hover:bg-slate-50/60">
                        <TableCell className="text-xs py-2">
                          {entry.employeeName}
                        </TableCell>
                        <TableCell className="text-xs py-2 font-mono text-muted-foreground">
                          {entry.bankAccount}
                        </TableCell>
                        <TableCell className="text-xs py-2 text-right tabular-nums">
                          {formatInr(entry.amount)}
                        </TableCell>
                        <TableCell className="py-2 text-center">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${ENTRY_STATUS_DOT[entry.status] ?? "bg-slate-300"}`}
                            title={entry.status}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface NewTransferFormState {
  month: string;
  totalAmount: string;
  employeeCount: string;
}

const DEFAULT_FORM: NewTransferFormState = {
  month: "",
  totalAmount: "",
  employeeCount: "",
};

export default function BankTransfersPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<NewTransferFormState>(DEFAULT_FORM);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const { data: transfers, isLoading, isError, refetch } = useBankTransfers();
  const createMutation = useCreateBankTransfer();
  const updateMutation = useUpdateBankTransfer();
  const generateFileMutation = useGenerateBankFile();

  function handleRetry() {
    void refetch();
  }

  function handleOpenSheet() {
    setSheetOpen(true);
  }

  function handleSheetOpenChange(open: boolean) {
    setSheetOpen(open);
    if (!open) setForm(DEFAULT_FORM);
  }

  function handleMonthChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, month: e.target.value }));
  }

  function handleTotalAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, totalAmount: e.target.value }));
  }

  function handleEmployeeCountChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, employeeCount: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate(
      {
        month: form.month,
        totalAmount: form.totalAmount,
        employeeCount: parseInt(form.employeeCount, 10) || 0,
        entries: [],
      },
      {
        onSuccess: () => {
          toast.success("Transfer run created");
          setSheetOpen(false);
          setForm(DEFAULT_FORM);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  const handleToggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleUpdateStatus = useCallback(
    (id: number, status: string, referenceNo?: string) => {
      updateMutation.mutate(
        { id, status, referenceNo },
        {
          onSuccess: () => toast.success(`Transfer marked as ${status.toLowerCase()}`),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [updateMutation],
  );

  const handleGenerateFile = useCallback(
    (id: number) => {
      generateFileMutation.mutate(id, {
        onSuccess: (result) => {
          const blob = new Blob([result.data], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `bank-transfer-${result.month}.csv`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success("NEFT file downloaded");
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    },
    [generateFileMutation],
  );

  const pageActions = (
    <Button
      size="sm"
      className="h-9 gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
      onClick={handleOpenSheet}
    >
      <Plus className="h-3.5 w-3.5" />
      New Transfer Run
    </Button>
  );

  return (
    <PageWrapper
      title="Bank Transfers"
      subtitle="Manage NEFT/RTGS payroll disbursement runs"
      actions={pageActions}
    >
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 p-5 animate-pulse"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-32 bg-slate-200 rounded" />
                  <div className="h-6 w-40 bg-slate-100 rounded" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-24 bg-slate-100 rounded-lg" />
                  <div className="h-8 w-8 bg-slate-100 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AlertCircle className="h-10 w-10 text-destructive/60" />
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">
              Failed to load bank transfers
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Something went wrong. Please try again.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Try Again
          </Button>
        </div>
      )}

      {!isLoading && !isError && (transfers?.length ?? 0) === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="flex flex-col items-center justify-center flex-1 py-24 gap-5"
        >
          <div className="p-4 rounded-2xl bg-violet-50 border border-violet-100">
            <Building2 className="h-10 w-10 text-violet-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">
              No transfer runs yet
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Create your first bank transfer run to disburse salaries via NEFT
              or RTGS.
            </p>
          </div>
          <Button
            size="sm"
            className="h-9 gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
            onClick={handleOpenSheet}
          >
            <Plus className="h-3.5 w-3.5" />
            New Transfer Run
          </Button>
        </motion.div>
      )}

      {!isLoading && !isError && (transfers?.length ?? 0) > 0 && (
        <div className="space-y-4">
          {(transfers ?? []).map((transfer, idx) => (
            <TransferCard
              key={transfer.id}
              transfer={transfer}
              idx={idx}
              isExpanded={expandedIds.has(transfer.id)}
              onToggleExpand={handleToggleExpand}
              onUpdateStatus={handleUpdateStatus}
              onGenerateFile={handleGenerateFile}
              isUpdating={updateMutation.isPending}
              isGenerating={generateFileMutation.isPending}
            />
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Transfer Run</SheetTitle>
            <SheetDescription>
              Create a bank transfer disbursement run for a payroll month.
              Employee entries are sourced from payroll runs and can be added
              after creation.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="bt-month" className="text-xs font-medium">
                Month (YYYY-MM)
              </Label>
              <Input
                id="bt-month"
                placeholder="2025-06"
                pattern="\d{4}-\d{2}"
                value={form.month}
                onChange={handleMonthChange}
                required
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                Format: YYYY-MM (e.g. 2025-06)
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bt-amount" className="text-xs font-medium">
                Total Amount (₹)
              </Label>
              <Input
                id="bt-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.totalAmount}
                onChange={handleTotalAmountChange}
                required
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bt-count" className="text-xs font-medium">
                Employee Count
              </Label>
              <Input
                id="bt-count"
                type="number"
                min="1"
                placeholder="0"
                value={form.employeeCount}
                onChange={handleEmployeeCountChange}
                required
                className="h-9"
              />
            </div>

            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
              <p className="text-xs text-blue-700 leading-relaxed">
                Individual employee bank entries are generated from approved
                payroll runs. You can add or update entries after creating this
                transfer run.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-10 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating…" : "Create Transfer Run"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
