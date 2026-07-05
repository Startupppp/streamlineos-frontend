"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { EmptyPayroll } from "@/components/illustrations";
import { RunStatusBadge } from "@/features/payroll/runs/run-status-badge";
import { MonthPicker } from "@/features/payroll/shared/month-picker";
import { formatMoney, formatMonth } from "@/features/payroll/shared/payroll-format";
import { usePayrollRuns, useCreateRun } from "@/hooks/api/payroll/runs";
import { useCan } from "@/hooks/api/access";
import type { PayrollRunListItem } from "@/types/payroll/runs";

export function RunsPageContent() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [showNewRun, setShowNewRun] = useState(false);
  const [newRunMonth, setNewRunMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

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
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
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

  function handleNewRunOpen() {
    setShowNewRun(true);
  }

  function handleNewRunClose() {
    setShowNewRun(false);
  }

  function handleNewRunCreate() {
    createMutation.mutate(newRunMonth, {
      onSuccess: (res) => {
        toast.success("Payroll run created");
        setShowNewRun(false);
        router.push(`/payroll/runs/${res.runId}`);
      },
      onError: (err) => {
        const msg = err instanceof Error ? err.message : "Failed to create run";
        toast.error(msg);
      },
    });
  }

  return (
    <PageWrapper
      title="Payroll Runs"
      subtitle={data ? `${data.total} total runs` : undefined}
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
          <div className="py-3 space-y-3">
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
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={handleNewRunClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleNewRunCreate}
              disabled={createMutation.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
