"use client";

import { useState, useCallback } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { LoadingState, ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { useTeamExpenses } from "@/hooks/api/accounting/expenses";
import { ExpenseStatsGrid } from "@/features/accounting/expenses/expense-stats";
import { ExpenseFiltersBar, type StatusFilter } from "@/features/accounting/expenses/expense-filters-bar";
import { ExpenseTable } from "@/features/accounting/expenses/expense-table";
import { ExpenseDetailSheet } from "@/features/accounting/expenses/expense-detail-sheet";
import type { ExpensePageDataRow } from "@/types/accounting/expenses";

export function TeamExpensesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ExpensePageDataRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);

  const query = useTeamExpenses({
    page,
    pageSize: 25,
    search: debouncedSearch.trim() || undefined,
    status: status === "ALL" ? undefined : status,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const handleRowClick = useCallback((row: ExpensePageDataRow) => {
    setSelected(row);
    setSheetOpen(true);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((value: StatusFilter) => {
    setStatus(value);
    setPage(1);
  }, []);

  const handleStartDateChange = useCallback((value: string) => {
    setStartDate(value);
    setPage(1);
  }, []);

  const handleEndDateChange = useCallback((value: string) => {
    setEndDate(value);
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setStatus("ALL");
    setStartDate("");
    setEndDate("");
    setPage(1);
  }, []);

  function handleRetry(): void {
    void query.refetch();
  }

  const expenses = query.data?.expenses ?? [];
  const pagination = query.data?.pagination;
  const filtersActive =
    search.trim() !== "" ||
    status !== "ALL" ||
    startDate !== "" ||
    endDate !== "";

  return (
    <PageWrapper
      title="Team Expenses"
      subtitle="Finance view of all employee expense submissions."
      filters={
        <ExpenseFiltersBar
          search={search}
          status={status}
          startDate={startDate}
          endDate={endDate}
          onSearchChange={handleSearchChange}
          onStatusChange={handleStatusChange}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={handleEndDateChange}
        />
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <ExpenseStatsGrid stats={query.data?.stats} isLoading={query.isLoading} />

        {query.isLoading && <LoadingState variant="table" rows={12} />}

        {query.error && (
          <ErrorState
            title="Failed to load expenses"
            description={getErrorMessage(query.error)}
            onRetry={handleRetry}
          />
        )}

        {!query.isLoading && !query.error && (
          <ExpenseTable
            data={expenses}
            isLoading={false}
            onRowClick={handleRowClick}
            page={pagination?.page ?? 1}
            pageSize={pagination?.pageSize ?? 25}
            total={pagination?.total ?? 0}
            onPageChange={setPage}
            className="flex-1 min-h-0"
            emptyState={
              <EmptyState
                illustration={<EmptyExpensesIllustration />}
                title="No expenses yet"
                description={
                  filtersActive
                    ? undefined
                    : "Employee expenses will appear here once submitted."
                }
                filtersActive={filtersActive}
                onClearFilters={handleClearFilters}
              />
            }
          />
        )}
      </div>

      <ExpenseDetailSheet
        expense={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </PageWrapper>
  );
}
