"use client";

import { useCallback, useState } from "react";
import type { SelfServiceHubChrome } from "@/lib/self-service-hub-chrome";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageState } from "@/components/shared/page-state";
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
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/expense-constants";
import type { StatusFilter } from "@/lib/expense-constants";
import { MemberExpenseList } from "@/features/hr/expenses/expense-list";
import { useExpensePageData, useWithdrawExpense } from "@/hooks/api/hr/expenses";
import { usePageState } from "@/hooks/api/use-page-state";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
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
    case "WITHDRAWN":
      return value;
    default:
      return "ALL";
  }
}

export function MyExpensesPage({ hubChrome }: { hubChrome?: SelfServiceHubChrome } = {}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ExpenseToEdit | null>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<ExpenseWithRelations | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const withdrawMutation = useWithdrawExpense();
  const withdrawIdempotent = useIdempotentOperation();

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

  const handleWithdrawRequest = useCallback((expense: ExpenseWithRelations) => {
    setWithdrawTarget(expense);
  }, []);

  const handleWithdrawDialogChange = useCallback((open: boolean) => {
    if (!open) setWithdrawTarget(null);
  }, []);

  const handleWithdrawConfirm = useCallback(() => {
    if (!withdrawTarget) return;
    const expenseId = withdrawTarget.id;
    withdrawMutation.mutate(
      { expenseId, config: withdrawIdempotent.configFor({ expenseId }) },
      {
        onSuccess() {
          withdrawIdempotent.settle();
          setWithdrawTarget(null);
          toast.success("Claim withdrawn");
        },
        onError(error) {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }, [withdrawTarget, withdrawMutation, withdrawIdempotent]);

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

  const handleClearFilters = useCallback(() => {
    setSearch("");
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
        <SelectTrigger
          aria-label="Filter claims by status"
          className="w-fit min-w-40 border-input bg-card"
        >
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value="ALL">All statuses</SelectItem>
          <SelectItem value="PENDING">Pending</SelectItem>
          <SelectItem value="APPROVED">Approved</SelectItem>
          <SelectItem value="REJECTED">Rejected</SelectItem>
          <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
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
  const pageState = usePageState({
    permission: "self:expenses",
    isLoading: expenses.isLoading && !data,
    isError: expenses.isError && !data,
    error: expenses.error,
    isEmpty,
  });

  return (
    <>
    <PageWrapper
      title={hubChrome?.title ?? "My Expenses"}
      subtitle={hubChrome?.subtitle ?? "Submit and track your reimbursement claims."}
      filters={
        hubChrome ? (
          <div className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:gap-2.5">
            <div className="flex w-full min-w-0 shrink-0 items-center">
              {hubChrome.tabs}
            </div>
            <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:gap-2.5 [&>[data-slot=search-input]]:min-w-[12rem] [&>[data-slot=search-input]]:flex-1 [&>[data-slot=search-input]]:basis-[12rem] [&>[data-slot=select-trigger]]:shrink-0">
              {filters}
            </div>
          </div>
        ) : (
          filters
        )
      }
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
      actions={
        <AnimatedIconButton icon={PlusIcon} onClick={handleOpenCreate}>
          Submit Claim
        </AnimatedIconButton>
      }
    >
      <PageState
        resolution={pageState}
        onRetry={expenses.refetch}
        onClearFilters={handleClearFilters}
        className="flex-1"
        loading={
          <div className={PAGE_BODY_SKELETON_CLASS}>
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        }
        empty={
          <EmptyState
            illustration={<EmptyExpensesIllustration className="h-full w-full" />}
            title="No expenses found"
            description={
              activeFilterCount > 0
                ? "No claim matches the current search and status."
                : "Submit your first expense claim to get started"
            }
            filtersActive={activeFilterCount > 0}
            onClearFilters={handleClearFilters}
            action={{ label: "Submit New Claim", onClick: handleOpenCreate }}
            className={PAGE_BODY_EMPTY_CLASS}
          />
        }
      >
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
            onWithdraw={handleWithdrawRequest}
            onShowAll={handleShowAll}
            onCreateNew={handleOpenCreate}
            onPageChange={setPage}
          />
        ) : null}
      </PageState>
    </PageWrapper>

      <ConfirmDialog
        open={withdrawTarget !== null}
        onOpenChange={handleWithdrawDialogChange}
        title="Withdraw this claim?"
        description="The claim leaves the approval queue and can no longer be approved or paid. Submit a new claim if you need to claim it again."
        confirmLabel="Withdraw claim"
        destructive
        isPending={withdrawMutation.isPending}
        keepOpenOnConfirm
        onConfirm={handleWithdrawConfirm}
      />

      <CreateExpenseDialog
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        onSuccess={handleSaved}
        categories={EXPENSE_CATEGORIES}
        paymentMethods={PAYMENT_METHODS}
        editExpense={editTarget}
        selfService
      />
    </>
  );
}
