"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Download, Upload } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  useExpensePageData,
  useUpdateExpenseStatus,
  useHrEmployees,
  unwrapEmployees,
} from "@/hooks/api/hr";
import type { Employee } from "@/types/hr";
import { CreateExpenseDialog } from "@/features/hr/expenses/components/create-expense-dialog";
import { ImportExpenseSheet } from "@/features/hr/expenses/components/import-expense-sheet";
import { ExpenseExportDialog } from "@/components/expenses/expense-export-dialog";
import { useExpenseFilters } from "@/hooks/common/use-expense-filters";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/shared";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { useMotionVariants } from "@/lib/motion-variants";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  type StatusFilter,
} from "@/lib/expense-constants";
import { AdminExpenseStats } from "@/features/hr/expenses/expense-stats";
import {
  AdminExpenseFilters,
  MemberExpenseFilters,
} from "@/features/hr/expenses/expense-filters";
import {
  AdminExpenseList,
  MemberExpenseList,
} from "@/features/hr/expenses/expense-list";
import type { ExpenseToEdit } from "@/features/hr/expenses/components/create-expense-dialog";
import type { ExpenseWithRelations } from "@/types/hr/expenses";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";

export function ExpensesPage() {
  const { staggerContainer, fadeUp } = useMotionVariants();
  const { data: session } = useSession();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseToEdit | null>(null);
  const [statusFilter, setStatusFilterState] = useState<StatusFilter>("ALL");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const isAdmin = useCan("hr:expenses:approve");

  const { filters, setFilter, setDatePreset, datePreset, activeFilterCount } =
    useExpenseFilters({
      defaultPageSize: isAdmin ? 4 : 5,
      syncToUrl: true,
    });

  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const setStatusFilter = useCallback(
    (s: StatusFilter) => {
      setStatusFilterState(s);
      setFilter("status", s === "ALL" ? "all" : s);
    },
    [setFilter],
  );

  const {
    data: pageData,
    isLoading,
    isError,
    error,
    refetch,
  } = useExpensePageData(
    {
      page: filters.page,
      pageSize: filters.pageSize,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder as "asc" | "desc" | undefined,
      startDate: filters.startDate,
      endDate: filters.endDate,
      month: filters.month,
      status:
        filters.status &&
        filters.status !== "all" &&
        !Array.isArray(filters.status)
          ? filters.status
          : undefined,
      category: filters.category,
      categoryId: filters.categoryId,
      search: debouncedSearch || undefined,
      userId: filters.userId,
      paymentMethod: filters.paymentMethod,
      minAmount: filters.minAmount,
      maxAmount: filters.maxAmount,
    },
    { selfService: !isAdmin },
  );

  const updateStatusMutation = useUpdateExpenseStatus();

  const { data: employeesRaw } = useHrEmployees({ limit: 100 }, { enabled: isAdmin });
  const employees = useMemo(() => {
    const raw = employeesRaw ? unwrapEmployees(employeesRaw) : [];
    return (raw as Employee[])
      .filter((e) => e.isActive)
      .map((e) => ({
        id: e.id,
        name: [e.firstName, e.lastName].filter(Boolean).join(" ") || e.email,
      }));
  }, [employeesRaw]);

  const handleApprove = useCallback(
    (expenseId: number) => {
      toast.promise(
        updateStatusMutation.mutateAsync({ expenseId, status: "APPROVED" }),
        {
          loading: "Approving expense...",
          success: () => {
            void refetch();
            return "Expense approved";
          },
          error: "Failed to approve expense",
        },
      );
    },
    [updateStatusMutation, refetch],
  );

  const handleReject = useCallback(
    (expenseId: number) => {
      if (!rejectionReason.trim()) return;
      toast.promise(
        updateStatusMutation.mutateAsync({
          expenseId,
          status: "REJECTED",
          rejectionReason,
        }),
        {
          loading: "Rejecting expense...",
          success: () => {
            setRejectingId(null);
            setRejectionReason("");
            void refetch();
            return "Expense rejected";
          },
          error: "Failed to reject expense",
        },
      );
    },
    [updateStatusMutation, rejectionReason, refetch],
  );

  const handleEdit = useCallback((expense: ExpenseToEdit) => {
    setEditingExpense(expense);
    setIsCreateOpen(true);
  }, []);

  const handleResubmit = useCallback((expense: ExpenseWithRelations) => {
    setIsCreateOpen(true);
    toast.info(
      expense.rejectionReason
        ? `Rejected: ${expense.rejectionReason}. Please create a new claim with corrections.`
        : "Please create a new claim with corrections.",
    );
  }, []);

  function handleRetryLoad() {
    void refetch();
  }

  const handleOpenImport = useCallback(() => setIsImportOpen(true), []);
  const handleOpenExport = useCallback(() => setIsExportOpen(true), []);
  const handleOpenAdminCreate = useCallback(() => setIsCreateOpen(true), []);
  const handleUserFilterChange = useCallback(
    (userId: string) => setFilter("userId", userId || undefined),
    [setFilter],
  );
  const handleRejectStart = useCallback((id: number) => {
    setRejectingId(id);
    setRejectionReason("");
  }, []);
  const handleRejectCancel = useCallback(() => {
    setRejectingId(null);
    setRejectionReason("");
  }, []);
  const handlePageChange = useCallback(
    (page: number) => setFilter("page", page),
    [setFilter],
  );
  const handleShowAll = useCallback(() => setStatusFilter("ALL"), [setStatusFilter]);
  const handleCreateDialogOpenChange = useCallback((open: boolean) => {
    setIsCreateOpen(open);
    if (!open) setEditingExpense(null);
  }, []);
  const handleCreateSuccess = useCallback(() => {
    void refetch();
    setIsCreateOpen(false);
    setEditingExpense(null);
  }, [refetch]);
  const handleImportSuccess = useCallback(() => {
    void refetch();
  }, [refetch]);
  const handleOpenMemberCreate = useCallback(() => setIsCreateOpen(true), []);
  const handleMemberCreateSuccess = useCallback(() => {
    void refetch();
    setIsCreateOpen(false);
  }, [refetch]);

  // The org-wide read needs the accounting module; self-service does not (HRMS-E2E-008).
  const pageState = usePageState({
    module: isAdmin ? "accounting" : undefined,
    isLoading: isLoading && !pageData,
    isError: isError && !pageData,
    error,
  });

  if (pageState.kind !== "ready") {
    return (
      <PageWrapper title="Expenses" subtitle="Manage your expense claims">
        <PageState
          resolution={pageState}
          loading={<LoadingState variant="page" />}
          onRetry={handleRetryLoad}
          className="flex-1"
        >
          {null}
        </PageState>
      </PageWrapper>
    );
  }

  const {
    expenses = [],
    pendingExpenses = [],
    stats = null,
    pagination = { page: 1, pageSize: 5, total: 0, totalPages: 0 },
  } = pageData ?? {};

  const filteredExpenses =
    statusFilter === "ALL"
      ? expenses
      : expenses.filter((e) => (e.status || "PENDING") === statusFilter);

  const pendingCount = stats?.pendingCount || pendingExpenses.length || 0;
  const totalPages = pagination.totalPages || 1;
  const startItem =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) * pagination.pageSize + 1;
  const endItem = Math.min(pagination.page * pagination.pageSize, pagination.total);

  if (isAdmin) {
    return (
      <PageWrapper
        title="Expense approvals"
        subtitle="Review and manage pending employee expense claims."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border bg-status-warning-surface text-status-warning-ink border-status-warning-rule">
                {pendingCount} pending
              </span>
            )}
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-sm" onClick={handleOpenImport}>
              <Upload className="h-4 w-4" />
              Import expenses
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <AnimatedIconButton
                  icon={EllipsisIcon}
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  aria-label="More actions"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onSelect={handleOpenExport}>
                  <Download className="h-4 w-4" />
                  Export expenses
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ExpenseExportDialog filters={filters} open={isExportOpen} onOpenChange={setIsExportOpen} />
            <Button size="sm" className="h-9 gap-1.5 text-sm" onClick={handleOpenAdminCreate}>
              <Plus className="h-4 w-4" />
              Add expense
            </Button>
          </div>
        }
      >
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex flex-1 min-h-0 flex-col gap-4"
        >
          <motion.div variants={fadeUp}>
            <AdminExpenseStats stats={stats} pendingCount={pendingCount} />
          </motion.div>
          <motion.div variants={fadeUp}>
            <AdminExpenseFilters
              statusFilter={statusFilter}
              pendingCount={pendingCount}
              onStatusChange={setStatusFilter}
              employees={employees}
              selectedUserId={filters.userId}
              onUserChange={handleUserFilterChange}
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <AdminExpenseList
              expenses={filteredExpenses}
              currentUserId={session?.user?.id}
              pagination={pagination}
              startItem={startItem}
              endItem={endItem}
              totalPages={totalPages}
              statusFilter={statusFilter}
              rejectingId={rejectingId}
              rejectionReason={rejectionReason}
              isPending={updateStatusMutation.isPending}
              onApprove={handleApprove}
              onRejectStart={handleRejectStart}
              onRejectConfirm={handleReject}
              onRejectCancel={handleRejectCancel}
              onRejectionReasonChange={setRejectionReason}
              onPageChange={handlePageChange}
              onShowAll={handleShowAll}
            />
          </motion.div>
        </motion.div>

        <CreateExpenseDialog
          open={isCreateOpen}
          onOpenChange={handleCreateDialogOpenChange}
          onSuccess={handleCreateSuccess}
          categories={EXPENSE_CATEGORIES}
          paymentMethods={PAYMENT_METHODS}
          editExpense={editingExpense}
        />
        <ImportExpenseSheet
          open={isImportOpen}
          onOpenChange={setIsImportOpen}
          onSuccess={handleImportSuccess}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="My expenses"
      subtitle="Track, manage, and submit your expense claims for reimbursement."
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
      actions={
        <Button size="sm" className="h-9 gap-1.5 text-sm" onClick={handleOpenMemberCreate}>
          <Plus className="h-4 w-4" />
          Submit expense claim
        </Button>
      }
      filters={
        <MemberExpenseFilters
          statusFilter={statusFilter}
          datePreset={datePreset}
          filters={filters}
          onStatusChange={setStatusFilter}
          onDatePresetChange={setDatePreset}
        />
      }
    >
      {filteredExpenses.length === 0 ? (
        <EmptyState
          illustration={<EmptyExpensesIllustration className="h-full w-full" />}
          title="No expenses found"
          description={
            statusFilter !== "ALL" || activeFilterCount > 0
              ? "Try adjusting your filters"
              : "Submit your first expense claim to get started"
          }
          action={
            statusFilter !== "ALL"
              ? { label: "Show All Claims", onClick: handleShowAll }
              : { label: "Submit New Claim", onClick: handleOpenMemberCreate }
          }
          className="min-h-0 flex-1 border-0 bg-transparent shadow-none"
        />
      ) : (
        <MemberExpenseList
          expenses={filteredExpenses}
          pagination={pagination}
          startItem={startItem}
          endItem={endItem}
          totalPages={totalPages}
          statusFilter={statusFilter}
          activeFilterCount={activeFilterCount}
          onEdit={handleEdit}
          onResubmit={handleResubmit}
          onShowAll={handleShowAll}
          onCreateNew={handleOpenMemberCreate}
          onPageChange={handlePageChange}
        />
      )}

      <CreateExpenseDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={handleMemberCreateSuccess}
        categories={EXPENSE_CATEGORIES}
        paymentMethods={PAYMENT_METHODS}
        editExpense={editingExpense}
        selfService
      />
    </PageWrapper>
  );
}
