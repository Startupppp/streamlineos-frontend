"use client";

import { useCallback, useState } from "react";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ErrorState } from "@/components/shared";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateExpenseDialog } from "@/features/hr/expenses/components/create-expense-dialog";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/features/hr/expenses/expense-constants";
import type { StatusFilter } from "@/features/hr/expenses/expense-constants";
import { MemberExpenseList } from "@/features/hr/expenses/expense-list";
import { MemberExpenseStats } from "@/features/hr/expenses/expense-stats";
import { useExpensePageData } from "@/hooks/api/hr/expenses";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getErrorMessage } from "@/lib/get-error-message";
import type { ExpenseToEdit } from "@/features/hr/expenses/components/create-expense-dialog";
import type { ExpenseWithRelations } from "@/types/hr/expenses";

const PAGE_SIZE = 10;

function toStatusFilter(value: string): StatusFilter {
  switch (value) {
    case "PENDING":
    case "APPROVED":
    case "REJECTED":
      return value;
    default:
      return "ALL";
  }
}

export function MyExpensesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ExpenseToEdit | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const expenses = useExpensePageData(
    {
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status: status === "ALL" ? undefined : status,
    },
    { selfService: true },
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatus(toStatusFilter(value));
    setPage(1);
  }, []);

  const handleOpenCreate = useCallback(() => {
    setEditTarget(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((expense: ExpenseToEdit) => {
    setEditTarget(expense);
    setDialogOpen(true);
  }, []);

  const handleResubmit = useCallback((expense: ExpenseWithRelations) => {
    setEditTarget(expense);
    setDialogOpen(true);
  }, []);

  const handleDialogChange = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditTarget(null);
  }, []);

  const handleSaved = useCallback(() => {
    setDialogOpen(false);
    setEditTarget(null);
    void expenses.refetch();
  }, [expenses]);

  const handleShowAll = useCallback(() => {
    setStatus("ALL");
    setPage(1);
  }, []);

  const filters = (
    <div className="flex min-w-0 flex-nowrap items-center gap-3 overflow-x-auto scrollbar-hide">
      <SearchInput
        value={search}
        onValueChange={handleSearchChange}
        placeholder="Search expenses..."
      />
      <Select value={status} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-fit min-w-40 border-input bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value="ALL">All statuses</SelectItem>
          <SelectItem value="PENDING">Pending</SelectItem>
          <SelectItem value="APPROVED">Approved</SelectItem>
          <SelectItem value="REJECTED">Rejected</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const data = expenses.data;
  const pagination = data?.pagination ?? {
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  };
  const startItem = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const endItem = Math.min(pagination.page * pagination.pageSize, pagination.total);

  return (
    <PageWrapper
      title="My Expenses"
      subtitle="Submit and track your reimbursement claims."
      filters={filters}
      actions={
        <AnimatedIconButton icon={PlusIcon} onClick={handleOpenCreate}>
          Submit Claim
        </AnimatedIconButton>
      }
    >
      {expenses.isLoading && !data ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-80 w-full rounded-lg" />
        </div>
      ) : null}

      {expenses.isError && !data ? (
        <ErrorState
          className="flex-1"
          title="Expenses unavailable"
          description={getErrorMessage(expenses.error)}
          onRetry={expenses.refetch}
        />
      ) : null}

      {data ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <MemberExpenseStats stats={data.stats} />
          <MemberExpenseList
            expenses={data.expenses}
            pagination={pagination}
            startItem={startItem}
            endItem={endItem}
            totalPages={Math.max(1, pagination.totalPages)}
            statusFilter={status}
            activeFilterCount={Number(Boolean(search)) + Number(status !== "ALL")}
            onEdit={handleEdit}
            onResubmit={handleResubmit}
            onShowAll={handleShowAll}
            onCreateNew={handleOpenCreate}
            onPageChange={setPage}
          />
        </div>
      ) : null}

      <CreateExpenseDialog
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        onSuccess={handleSaved}
        categories={EXPENSE_CATEGORIES}
        paymentMethods={PAYMENT_METHODS}
        editExpense={editTarget}
        selfService
      />
    </PageWrapper>
  );
}
