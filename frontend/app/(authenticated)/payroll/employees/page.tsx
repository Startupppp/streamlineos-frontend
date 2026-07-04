"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { EmptyPersonIllustration } from "@/components/illustrations/empty-person";
import { SalaryProfileSheet } from "@/features/payroll/runs/salary-profile-sheet";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import { useEmployeeProfiles } from "@/hooks/api/payroll/employees";
import { useCan } from "@/hooks/api/access";
import type { EmployeeSalaryProfile, SalaryProfileStatus } from "@/types/payroll/runs";

const STATUS_CONFIG: Record<SalaryProfileStatus, { className: string; label: string }> = {
  ACTIVE: { className: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Active" },
  UPCOMING: { className: "bg-blue-50 text-blue-700 border-blue-200", label: "Upcoming" },
  SUPERSEDED: { className: "bg-slate-100 text-slate-500 border-slate-200", label: "Superseded" },
};

export default function PayrollEmployeesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [workerType, setWorkerType] = useState("all");
  const [status, setStatus] = useState("all");
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  const canView = useCan("payroll:salaries:view");
  const canUpdate = useCan("payroll:salaries:update");

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
          <span className="text-[11px] font-medium truncate">{row.userName}</span>
          <span className="text-[10px] text-muted-foreground truncate">{row.userEmail}</span>
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

  function handleSearchChange(val: string) {
    setSearch(val);
    setPage(1);
  }

  function handleWorkerTypeChange(val: string) {
    setWorkerType(val);
    setPage(1);
  }

  function handleStatusChange(val: string) {
    setStatus(val);
    setPage(1);
  }

  function handleAddOpen() {
    setAddSheetOpen(true);
  }

  function handleAddClose() {
    setAddSheetOpen(false);
  }

  if (!canView) {
    return (
      <PageWrapper title="Salary Profiles" backHref="/payroll">
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
      subtitle={data ? `${data.total} profiles` : undefined}
      backHref="/payroll"
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
            <SelectTrigger className="h-8 w-36 text-xs">
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
            <SelectTrigger className="h-8 w-32 text-xs">
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
          onPageChange: setPage,
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
