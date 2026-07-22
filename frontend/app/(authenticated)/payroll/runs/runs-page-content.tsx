"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyPayroll } from "@/components/illustrations";
import { RunStatusBadge } from "@/features/payroll/runs/run-status-badge";
import { MonthPicker } from "@/features/payroll/shared/month-picker";
import { formatMoney, formatMonth } from "@/features/payroll/shared/payroll-format";
import {
  usePayrollRuns,
  useCreateRun,
  type PayrollRunType,
} from "@/hooks/api/payroll/runs";
import { useCan } from "@/hooks/api/access";
import type { PayrollRunListItem } from "@/types/payroll/runs";

const RUN_TYPE_OPTIONS: { value: PayrollRunType; label: string; hint: string }[] = [
  { value: "REGULAR", label: "Regular", hint: "The month's standard payroll run" },
  { value: "BONUS", label: "Bonus", hint: "Approved variable pay, separate from regular pay" },
  { value: "OFF_CYCLE", label: "Off-cycle", hint: "Joiner, advance, or special payment" },
  { value: "CORRECTION", label: "Correction", hint: "Corrects a closed or paid result" },
  { value: "FINAL_SETTLEMENT", label: "Final settlement", hint: "Termination / F&F run" },
];

const RUN_TYPES_NEEDING_SOURCE: PayrollRunType[] = ["OFF_CYCLE", "CORRECTION", "FINAL_SETTLEMENT"];

export function RunsPageContent() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [showNewRun, setShowNewRun] = useState(false);
  const [newRunMonth, setNewRunMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [newRunType, setNewRunType] = useState<PayrollRunType>("REGULAR");
  const [sourceRunId, setSourceRunId] = useState<string>("");

  const canManage = useCan("payroll:runs:manage");
  const { data, isLoading } = usePayrollRuns({ page, limit: 20 });
  const createMutation = useCreateRun();

  const columns: DataTableColumn<PayrollRunListItem>[] = [
    {
      key: "month",
      header: "Month",
      cell: (row) => (
        <span className="text-[11px] font-medium">{formatMonth(row.month)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <RunStatusBadge status={row.status} />,
    },
    {
      key: "employees",
      header: "Employees",
      cell: (row) => (
        <span className="tabular-nums text-[11px]">{row.employeeCount ?? "—"}</span>
      ),
    },
    {
      key: "gross",
      header: "Gross",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-[11px] tabular-nums">{formatMoney(row.grossTotal)}</span>
      ),
    },
    {
      key: "net",
      header: "Net",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-[11px] tabular-nums font-medium">
          {formatMoney(row.netTotal)}
        </span>
      ),
    },
    {
      key: "exceptions",
      header: "Exceptions",
      cell: (row) =>
        (row.exceptionCount ?? 0) > 0 ? (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30">
            {row.exceptionCount}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">0</span>
        ),
    },
  ];

  function handleRowClick(row: PayrollRunListItem) {
    router.push(`/payroll/runs/${row.id}`);
  }

  const needsSource = RUN_TYPES_NEEDING_SOURCE.includes(newRunType);
  const sourceRunOptions = (data?.data ?? []).filter((r) => r.month === newRunMonth);
  const createDisabled =
    createMutation.isPending || (needsSource && sourceRunId === "");

  function resetNewRunForm() {
    setNewRunType("REGULAR");
    setSourceRunId("");
  }

  function handleNewRunOpen() {
    resetNewRunForm();
    setShowNewRun(true);
  }

  function handleNewRunClose() {
    setShowNewRun(false);
  }

  function handleNewRunTypeChange(value: string) {
    setNewRunType(value as PayrollRunType);
    setSourceRunId("");
  }

  function handleNewRunCreate() {
    if (needsSource && sourceRunId === "") {
      toast.error("Select the source run this run adjusts");
      return;
    }
    createMutation.mutate(
      {
        month: newRunMonth,
        runType: newRunType,
        ...(needsSource ? { sourceRunId: Number(sourceRunId) } : {}),
      },
      {
        onSuccess: (res) => {
          toast.success("Payroll run created");
          setShowNewRun(false);
          router.push(`/payroll/runs/${res.runId}`);
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
        },
      },
    );
  }

  return (
    <PageWrapper
      title="Payroll Runs"
      subtitle="View and manage payroll runs by month"
      backHref="/payroll"
      actions={
        canManage ? (
          <Button size="sm" onClick={handleNewRunOpen}>
            New run
          </Button>
        ) : undefined
      }
    >
      <DataTable
        className="flex-1 min-h-0"
        data={data?.data ?? []}
        columns={columns}
        getRowKey={(row) => row.id}
        onRowClick={handleRowClick}
        isLoading={isLoading}
        minWidth="640px"
        pagination={{
          mode: "server",
          page,
          pageSize: 20,
          total: data?.total ?? 0,
          onPageChange: setPage,
        }}
        emptyState={
          <EmptyState
            illustration={<EmptyPayroll />}
            title="No payroll runs"
            description="Start your first payroll run to see it here"
            action={canManage ? { label: "New run", onClick: handleNewRunOpen } : undefined}
          />
        }
      />

      <Dialog open={showNewRun} onOpenChange={setShowNewRun}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a new payroll run</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground block">
                Run type
              </label>
              <Select value={newRunType} onValueChange={handleNewRunTypeChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RUN_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {RUN_TYPE_OPTIONS.find((o) => o.value === newRunType)?.hint}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground block">
                Payroll month
              </label>
              <MonthPicker
                value={newRunMonth}
                onChange={setNewRunMonth}
                yearRange={[-1, 0]}
                className="w-full"
              />
            </div>

            {needsSource && (
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-foreground block">
                  Source run <span className="text-destructive">*</span>
                </label>
                <Select value={sourceRunId} onValueChange={setSourceRunId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select the run this adjusts" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceRunOptions.length === 0 ? (
                      <div className="px-2 py-1.5 text-[12px] text-muted-foreground">
                        No runs for {formatMonth(newRunMonth)} to link to
                      </div>
                    ) : (
                      sourceRunOptions.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {formatMonth(r.month)} · {r.status.replace(/_/g, " ")}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Off-cycle, correction, and final-settlement runs link back to the
                  regular run they adjust.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={handleNewRunClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleNewRunCreate} disabled={createDisabled}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
