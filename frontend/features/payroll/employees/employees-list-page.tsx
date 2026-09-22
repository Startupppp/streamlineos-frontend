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
import { ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import { useEmployeeProfiles } from "@/hooks/api/payroll/employees";
import { useCan } from "@/hooks/api/access";
import type { EmployeeSalaryProfile, SalaryProfileStatus } from "@/types/payroll/runs";
import { TruncatedText } from "@/components/ui/truncated-text";
import { usePayrollWorkforceLabel } from "@/features/payroll/lib/payroll-workforce-label";
import { SearchInput } from "@/components/ui/search-input";
import { useCursorPager } from "@/components/ui/table-pagination";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useState } from "react";

const PAGE_SIZE = 20;

const STATUS_CONFIG: Record<SalaryProfileStatus, { className: string; label: string }> = {
  ACTIVE: { className: "bg-status-success-surface text-status-success-ink border-status-success-rule", label: "Active" },
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
  const workforceLabel = usePayrollWorkforceLabel();

  const search = searchParams.get("search") ?? "";
  const workerType = searchParams.get("workerType") ?? "all";
  const status = searchParams.get("status") ?? "all";
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const pager = useCursorPager(`${debouncedSearch}|${workerType}|${status}`);

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function handleSearchChange(val: string) {
    updateParams({ search: val });
  }

  function handleWorkerTypeChange(val: string) {
    updateParams({ workerType: val });
  }

  function handleStatusChange(val: string) {
    updateParams({ status: val });
  }

  function handleClearFilters() {
    updateParams({ search: "", workerType: "all", status: "all" });
  }

  const filtersActive =
    search.trim() !== "" || workerType !== "all" || status !== "all";

  const { data, isLoading, isError, error, refetch } = useEmployeeProfiles({
    cursor: pager.cursor,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    workerType: workerType !== "all" ? workerType : undefined,
    status: status !== "all" ? status : undefined,
  });

  function handleNextPage() {
    pager.goNext(data?.pagination.nextCursor);
  }

  function handlePreviousPage() {
    pager.goPrevious();
  }

  function handleRetry() {
    void refetch();
  }

  const columns: DataTableColumn<EmployeeSalaryProfile>[] = [
    {
      key: "employee",
      header: workforceLabel.singular,
      cell: (row) => (
        <div className="flex flex-col gap-0.5 min-w-0">
          <TruncatedText text={row.userName ?? "Payee"} className="text-dense font-medium" />
          <TruncatedText text={row.userEmail ?? "—"} className="text-micro text-muted-foreground" />
        </div>
      ),
    },
    {
      key: "workerType",
      header: "Type",
      cell: (row) => (
        <span className="text-micro text-muted-foreground">{row.workerType}</span>
      ),
    },
    {
      key: "annualCtc",
      header: "Annual CTC",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums">{formatMoney(row.annualCtc)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => {
        const cfg = STATUS_CONFIG[row.status];
        return (
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-micro font-medium border ${cfg.className}`}
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
        <span className="font-mono text-dense tabular-nums text-muted-foreground">
          {row.effectiveFrom}
        </span>
      ),
    },
    {
      key: "currency",
      header: "Currency",
      cell: (row) => (
        <span className="text-dense text-muted-foreground">{row.currency}</span>
      ),
    },
  ];

  function handleRowClick(row: EmployeeSalaryProfile) {
    if (row.userId) {
      router.push(`/payroll/employees/${row.userId}`);
      return;
    }
    if (row.workerId) {
      router.push(`/payroll/workers/${row.workerId}`);
    }
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
      subtitle={workforceLabel.profileSubtitle}
      actions={
        canUpdate ? (
          <Button size="sm" onClick={handleAddOpen}>
            Add salary
          </Button>
        ) : undefined
      }
      filters={
        <>
          <SearchInput
            value={search}
            onValueChange={handleSearchChange}
            placeholder={workforceLabel.searchPlaceholder}
          />
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
      {isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load salary profiles"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : (
        <DataTable
          className="flex-1 min-h-0"
          data={data?.data ?? []}
          columns={columns}
          getRowKey={(row) => row.id}
          onRowClick={handleRowClick}
          isLoading={isLoading}
          minWidth="680px"
          pagination={{
            mode: "cursor",
            pageSize: PAGE_SIZE,
            hasMore: data?.pagination.hasMore ?? false,
            hasPrevious: pager.hasPrevious,
            onNext: handleNextPage,
            onPrevious: handlePreviousPage,
          }}
          mobileCard={(row) => {
            const cfg = STATUS_CONFIG[row.status];
            return (
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{row.userName}</p>
                    <p className="text-dense text-muted-foreground truncate">{row.userEmail}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-micro font-medium border shrink-0 ${cfg.className}`}
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
              description={
                filtersActive ? undefined : workforceLabel.emptyDescription
              }
              filtersActive={filtersActive}
              onClearFilters={handleClearFilters}
              action={
                canUpdate && !filtersActive
                  ? { label: "Add salary", onClick: handleAddOpen }
                  : undefined
              }
            />
          }
        />
      )}

      <SalaryProfileSheet
        open={addSheetOpen}
        onClose={handleAddClose}
      />
    </PageWrapper>
  );
}
