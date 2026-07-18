"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyPersonIllustration } from "@/components/illustrations";
import { FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { useAdminLoans, type LoanAdminItem, type LoanStatus } from "@/hooks/api/payroll/loans-admin";
import { usePayrollRuns } from "@/hooks/api/payroll/runs";
import { useCan } from "@/hooks/api/access";
import { LoanAdjustmentDialog } from "./loan-adjustment-dialog";
import { LoanApprovalDialog } from "./loan-approval-dialog";
import { buildLoanColumns } from "./loan-table-columns";
import type { LoanAdjustmentType } from "@/types/payroll";
import type { PayrollRunStatus } from "@/types/payroll/runs";

const SENTINEL = "all";

const LOCKED_STATUSES: readonly PayrollRunStatus[] = [
  "LOCKED",
  "PAID",
  "PAYSLIPS_PUBLISHED",
  "CLOSED",
];

const STATUS_OPTIONS: { value: LoanStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "ACTIVE", label: "Active" },
  { value: "REPAID", label: "Repaid" },
  { value: "REJECTED", label: "Rejected" },
];

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type AdjustDialogState = {
  loanId: number;
  employeeName: string;
  defaultType: LoanAdjustmentType;
} | null;

type ApprovalDialogState = {
  loanId: number;
  action: "approve" | "reject";
} | null;

export function LoansTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") ?? SENTINEL;

  const [adjustState, setAdjustState] = useState<AdjustDialogState>(null);
  const [approvalState, setApprovalState] = useState<ApprovalDialogState>(null);

  const canManage = useCan("payroll:runs:update");
  const { data: loans, isLoading } = useAdminLoans();
  const { data: runsData } = usePayrollRuns({ limit: 12 });

  const activeRunId = useMemo(() => {
    const currentMonth = getCurrentMonth();
    const run = runsData?.data.find(
      (r) => r.month === currentMonth && !LOCKED_STATUSES.includes(r.status),
    );
    return run?.id ?? null;
  }, [runsData]);

  const filtered = useMemo(() => {
    const all = loans ?? [];
    return statusFilter !== SENTINEL
      ? all.filter((l) => l.status === statusFilter)
      : all;
  }, [loans, statusFilter]);

  function handleStatusChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === SENTINEL) {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    router.replace(`?${params.toString()}`);
  }

  function handleOpenAdjust(row: LoanAdminItem, defaultType: LoanAdjustmentType) {
    setAdjustState({ loanId: row.id, employeeName: row.user.name ?? row.user.email, defaultType });
  }

  function handleOpenApproval(loanId: number, action: "approve" | "reject") {
    setApprovalState({ loanId, action });
  }

  function handleAdjustClose() {
    setAdjustState(null);
  }

  function handleApprovalClose() {
    setApprovalState(null);
  }

  const columns = useMemo(
    () => buildLoanColumns({ canManage, onAdjust: handleOpenAdjust, onApproval: handleOpenApproval }),
    [canManage],
  );

  return (
    <>
      {activeRunId === null && !isLoading && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-xs mb-3 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          No active payroll run for this period. Loan adjustments are unavailable.
        </div>
      )}
      <div className={`${FILTER_TOOLBAR_ROW} mb-3`}>
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className={`${FILTER_SELECT_TRIGGER} w-44`}>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SENTINEL}>All statuses</SelectItem>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
        <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
          <DataTable
            data={filtered}
            columns={columns}
            getRowKey={(row) => row.id}
            isLoading={isLoading}
            minWidth="780px"
            pagination={{ pageSize: 20 }}
            emptyState={
              <EmptyState
                illustration={<EmptyPersonIllustration />}
                title="No active loans"
                description="Employee salary loans and advances will appear here"
              />
            }
          />
        </CardContent>
      </Card>
      <LoanAdjustmentDialog
        loanId={adjustState?.loanId ?? 0}
        loanEmployeeName={adjustState?.employeeName ?? ""}
        runId={activeRunId}
        open={adjustState !== null}
        onClose={handleAdjustClose}
        defaultType={adjustState?.defaultType}
      />
      <LoanApprovalDialog
        loanId={approvalState?.loanId ?? 0}
        action={approvalState?.action ?? "approve"}
        open={approvalState !== null}
        onClose={handleApprovalClose}
      />
    </>
  );
}
