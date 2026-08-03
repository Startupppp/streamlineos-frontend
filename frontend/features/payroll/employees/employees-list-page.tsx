"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyPersonIllustration } from "@/components/illustrations";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { SalaryProfileSheet } from "@/features/payroll/runs/salary-profile-sheet";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import { useEmployeeProfiles } from "@/hooks/api/payroll/employees";
import { useCan } from "@/hooks/api/access";
import type { EmployeeSalaryProfile, SalaryProfileStatus } from "@/types/payroll/runs";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useState } from "react";

const STATUS_CONFIG: Record<SalaryProfileStatus, { className: string; label: string }> = {
  ACTIVE: { className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30", label: "Active" },
  UPCOMING: { className: "bg-primary/10 text-foreground border-primary/20", label: "Upcoming" },
  SUPERSEDED: { className: "bg-muted text-muted-foreground border-border", label: "Superseded" },
};

export function EmployeesListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  const canView = useCan("payroll:salaries:view");
  const canUpdate = useCan("payroll:salaries:update");

  const search = searchParams.get("search") ?? "";
  const workerType = searchParams.get("workerType") ?? "all";
  const status = searchParams.get("status") ?? "all";
  const page = Number(searchParams.get("page") ?? "1");

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === "" || value === "all" || value === "1") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function handleSearchChange(val: string) {
    updateParams({ search: val, page: "1" });
  }

  function handleWorkerTypeChange(val: string) {
    updateParams({ workerType: val, page: "1" });
  }

  function handleStatusChange(val: string) {
    updateParams({ status: val, page: "1" });
  }

  function handlePageChange(val: number) {
    updateParams({ page: String(val) });
  }

  const { data, isLoading } = useEmployeeProfiles({
    page,
    limit: 20,
    search: search || undefined,
    workerType: workerType !== "all" ? workerType : undefined,
    status: status !== "all" ? status : undefined,
  });

  const columns: DataTableColumn<EmployeeSalaryProfile>[] = [
    {
      key: "employee",
      header: "Employee",
      cell: (row) => (
        <div className="flex flex-col gap-0.5 min-w-0">
          <TruncatedText text={row.userName} className="text-[11px] font-medium" />
          <TruncatedText text={row.userEmail} className="text-[10px] text-muted-foreground" />
        </div>
      ),
    },
    {
      key: "workerType",
      header: "Type",
      cell: (row) => (
        <span className="text-[10px] text-muted-foreground">{row.workerType}</span>
      ),
    },
    {
      key: "annualCtc",
      header: "Annual CTC",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-[11px] tabular-nums">{formatMoney(row.annualCtc)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => {
        const cfg = STATUS_CONFIG[row.status];
        return (
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${cfg.className}`}
          >
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: "effectiveFrom",
      header: "Effective From",
      cell: (row) => (
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {row.effectiveFrom}
        </span>
      ),
    },
    {
      key: "currency",
      header: "Currency",
      cell: (row) => (
        <span className="text-[11px] text-muted-foreground">{row.currency}</span>
      ),
    },
  ];

  function handleRowClick(row: EmployeeSalaryProfile) {
    router.push(`/payroll/employees/${row.userId}`);
  }

  function handleAddOpen() {
    setAddSheetOpen(true);
  }

  function handleAddClose() {
    setAddSheetOpen(false);
  }

  if (!canView) {
    return (
      <PageWrapper title="Salary Profiles">
        <EmptyState
          illustration={<EmptyPersonIllustration />}
          title="Access Denied"
          description="You don't have permission to view salary profiles."
          compact
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Salary Profiles"
      subtitle="Per-employee CTC and pay configuration"
      actions={
        canUpdate ? (
          <Button size="sm" onClick={handleAddOpen}>
            Add salary
          </Button>
        ) : undefined
      }
      filters={
        <>
          <Select value={workerType} onValueChange={handleWorkerTypeChange}>
            <SelectTrigger className={`${FILTER_SELECT_TRIGGER} w-36`}>
              <SelectValue placeholder="Worker type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="EMPLOYEE">Employee</SelectItem>
              <SelectItem value="CONTRACTOR">Contractor</SelectItem>
              <SelectItem value="CONSULTANT">Consultant</SelectItem>
              <SelectItem value="INTERN">Intern</SelectItem>
              <SelectItem value="EOR">EOR</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className={`${FILTER_SELECT_TRIGGER} w-32`}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="UPCOMING">Upcoming</SelectItem>
              <SelectItem value="SUPERSEDED">Superseded</SelectItem>
            </SelectContent>
          </Select>
        </>
      }
    >
      <DataTable
        className="flex-1 min-h-0"
        data={data?.data ?? []}
        columns={columns}
        getRowKey={(row) => row.id}
        onRowClick={handleRowClick}
        isLoading={isLoading}
        minWidth="680px"
        search={{ value: search, onChange: handleSearchChange, placeholder: "Search employees…" }}
        pagination={{
          mode: "server",
          page,
          pageSize: 20,
          total: data?.total ?? 0,
          onPageChange: handlePageChange,
        }}
        mobileCard={(row) => {
          const cfg = STATUS_CONFIG[row.status];
          return (
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{row.userName}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{row.userEmail}</p>
                </div>
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0 ${cfg.className}`}
                >
                  {cfg.label}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{row.workerType}</span>
                <span className="font-mono tabular-nums text-foreground">
                  {formatMoney(row.annualCtc)}
                </span>
              </div>
            </div>
          );
        }}
        emptyState={
          <EmptyState
            illustration={<EmptyPersonIllustration />}
            title="No salary profiles"
            description="Add salary profiles to include employees in payroll runs"
          />
        }
      />

      <SalaryProfileSheet
        open={addSheetOpen}
        onClose={handleAddClose}
      />
    </PageWrapper>
  );
}
