"use client";

import { useCallback, useState } from "react";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import {
  PAGE_BODY_EMPTY_CLASS,
  PAGE_BODY_SKELETON_CLASS,
} from "@/components/ui/content-fill-panel";
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
    <>
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
    </>
  );

  const data = expenses.data;
  const list = data?.expenses ?? [];
  const pagination = data?.pagination ?? {
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  };
  const startItem = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const endItem = Math.min(pagination.page * pagination.pageSize, pagination.total);
  const activeFilterCount = Number(Boolean(search)) + Number(status !== "ALL");
  const isEmpty = Boolean(data) && list.length === 0;

  return (
    <PageWrapper
      title="My Expenses"
      subtitle="Submit and track your reimbursement claims."
      filters={filters}
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
      actions={
        <AnimatedIconButton icon={PlusIcon} onClick={handleOpenCreate}>
          Submit Claim
        </AnimatedIconButton>
      }
    >
      {expenses.isLoading && !data ? (
        <div className={PAGE_BODY_SKELETON_CLASS}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : null}

      {expenses.isError && !data ? (
        <ErrorState
          className={PAGE_BODY_EMPTY_CLASS}
          title="Expenses unavailable"
          description={getErrorMessage(expenses.error)}
          onRetry={expenses.refetch}
        />
      ) : null}

      {isEmpty ? (
        <EmptyState
          illustration={<EmptyExpensesIllustration className="h-full w-full" />}
          title="No expenses found"
          description={
            status !== "ALL" || activeFilterCount > 0
              ? "Try adjusting your filters"
              : "Submit your first expense claim to get started"
          }
          action={
            status !== "ALL"
              ? { label: "Show All Claims", onClick: handleShowAll }
              : { label: "Submit New Claim", onClick: handleOpenCreate }
          }
          className={PAGE_BODY_EMPTY_CLASS}
        />
      ) : null}

      {data && list.length > 0 ? (
        <MemberExpenseList
          expenses={list}
          pagination={pagination}
          startItem={startItem}
          endItem={endItem}
          totalPages={Math.max(1, pagination.totalPages)}
          statusFilter={status}
          activeFilterCount={activeFilterCount}
          onEdit={handleEdit}
          onResubmit={handleResubmit}
          onShowAll={handleShowAll}
          onCreateNew={handleOpenCreate}
          onPageChange={setPage}
        />
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
