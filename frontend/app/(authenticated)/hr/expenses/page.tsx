"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useExpensePageData,
  useUpdateExpenseStatus,
  useDeleteExpense,
  useHrEmployees,
} from "@/lib/api/hooks/hr";
import type { Employee, PaginatedEmployees } from "@/types/hr";
import { CreateExpenseDialog } from "./create-expense-dialog";
import { ImportExpenseSheet } from "./import-expense-sheet";
import ExpensesLoading from "./loading";
import { ExpenseExportDialog } from "@/components/expenses/expense-export-dialog";
import {
  useExpenseFilters,
  useDebouncedValue,
} from "@/hooks/use-expense-filters";
import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  type StatusFilter,
} from "@/features/hr/expenses/expense-constants";
import {
  AdminExpenseStats,
  MemberExpenseStats,
} from "@/features/hr/expenses/expense-stats";
import {
  AdminExpenseFilters,
  MemberExpenseFilters,
} from "@/features/hr/expenses/expense-filters";
import {
  AdminExpenseList,
  MemberExpenseList,
} from "@/features/hr/expenses/expense-list";
import type { ExpenseToEdit } from "./create-expense-dialog";
import type { ExpenseWithRelations } from "@/server/actions/expense-query";
import { useAbility } from "@/lib/abilities-context";

export default function ExpensesPage() {
  const { data: session } = useSession();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseToEdit | null>(
    null,
  );
  const [statusFilter, setStatusFilterState] = useState<StatusFilter>("ALL");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);

  const ability = useAbility();
  const isAdmin = ability.can("manage", "hr:employees");

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
    refetch,
  } = useExpensePageData({
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
  });

  const updateStatusMutation = useUpdateExpenseStatus();
  const deleteMutation = useDeleteExpense();

  const { data: employeesRaw } = useHrEmployees({ limit: 200 });
  const employees = useMemo(() => {
    const raw = employeesRaw
      ? Array.isArray(employeesRaw)
        ? (employeesRaw as Employee[])
        : ((employeesRaw as PaginatedEmployees).data ?? [])
      : [];
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

  const handleDelete = useCallback(
    (expenseId: number) => {
      toast.promise(deleteMutation.mutateAsync(expenseId), {
        loading: "Deleting expense...",
        success: () => {
          void refetch();
          return "Expense deleted";
        },
        error: "Failed to delete expense",
      });
    },
    [deleteMutation, refetch],
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

  if (isLoading && !pageData) return <ExpensesLoading />;

  const {
    expenses = [],
    pendingExpenses = [],
    stats = null,
    pagination = { page: 1, pageSize: 5, total: 0, totalPages: 0 },
    categories: rawCategories = [],
  } = pageData ?? {};

  const expenseCategories =
    (
      rawCategories as {
        id: number;
        name: string;
        description: string | null;
        budgetLimit: string | null;
        budgetPeriod: string | null;
        isActive: boolean | null;
      }[]
    ).length > 0
      ? (rawCategories as {
          id: number;
          name: string;
          description: string | null;
          budgetLimit: string | null;
          budgetPeriod: string | null;
          isActive: boolean | null;
        }[])
      : EXPENSE_CATEGORIES.map((name, i) => ({
          id: i + 1,
          name,
          description: null,
          budgetLimit: null,
          budgetPeriod: null,
          isActive: true,
        }));

  const typedExpenses = expenses as ExpenseWithRelations[];
  const typedPending = pendingExpenses as ExpenseWithRelations[];

  const filteredExpenses =
    statusFilter === "ALL"
      ? typedExpenses
      : typedExpenses.filter((e) => (e.status || "PENDING") === statusFilter);

  const pendingCount = stats?.pendingCount || typedPending.length || 0;
  const totalPages = pagination.totalPages || 1;
  const startItem =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) * pagination.pageSize + 1;
  const endItem = Math.min(
    pagination.page * pagination.pageSize,
    pagination.total,
  );

  if (isAdmin) {
    return (
      <PageWrapper
        title="Expense Approvals"
        subtitle="Review and manage pending employee expense claims."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                {pendingCount} pending
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-sm"
              onClick={() => setIsImportOpen(true)}
            >
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <ExpenseExportDialog
              filters={filters}
              categories={expenseCategories}
              trigger={
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-sm">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              }
            />
            <Button size="sm" className="h-9 gap-1.5 text-sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
          </div>
        }
      >
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-4"
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
              onUserChange={(userId) => setFilter("userId", userId || undefined)}
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
              onRejectStart={(id) => {
                setRejectingId(id);
                setRejectionReason("");
              }}
              onRejectConfirm={handleReject}
              onRejectCancel={() => {
                setRejectingId(null);
                setRejectionReason("");
              }}
              onRejectionReasonChange={setRejectionReason}
              onPageChange={(page) => setFilter("page", page)}
              onShowAll={() => setStatusFilter("ALL")}
            />
          </motion.div>
        </motion.div>

        <CreateExpenseDialog
          open={isCreateOpen}
          onOpenChange={(v) => {
            setIsCreateOpen(v);
            if (!v) setEditingExpense(null);
          }}
          onSuccess={() => {
            void refetch();
            setIsCreateOpen(false);
            setEditingExpense(null);
          }}
          categories={EXPENSE_CATEGORIES}
          paymentMethods={PAYMENT_METHODS}
          editExpense={editingExpense}
        />
        <ImportExpenseSheet
          open={isImportOpen}
          onOpenChange={setIsImportOpen}
          onSuccess={() => void refetch()}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="My Expenses"
      subtitle="Track, manage, and submit your expense claims for reimbursement."
      actions={
        <Button size="sm" className="h-9 gap-1.5 text-sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Submit New Claim
        </Button>
      }
    >
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={fadeUp}>
          <MemberExpenseStats stats={stats} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MemberExpenseFilters
            statusFilter={statusFilter}
            datePreset={datePreset}
            filters={filters}
            categories={expenseCategories}
            onStatusChange={setStatusFilter}
            onDatePresetChange={setDatePreset}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
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
            onShowAll={() => setStatusFilter("ALL")}
            onCreateNew={() => setIsCreateOpen(true)}
            onPageChange={(page) => setFilter("page", page)}
          />
        </motion.div>
      </motion.div>

      <CreateExpenseDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          void refetch();
          setIsCreateOpen(false);
        }}
        categories={EXPENSE_CATEGORIES}
        paymentMethods={PAYMENT_METHODS}
      />
    </PageWrapper>
  );
}
