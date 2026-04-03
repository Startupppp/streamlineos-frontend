"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { motion } from "framer-motion";
import { Plus, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  approveExpense,
  rejectExpense,
  markExpenseAsPaid,
  deleteExpense,
} from "@/server/actions/expense-actions";
import {
  getExpensePageData,
  ExpensePageData,
  ExpenseWithRelations,
} from "@/server/actions/expense-query";
import { CreateExpenseDialog } from "./create-expense-dialog";
import { ImportExpenseSheet } from "./import-expense-sheet";
import { ExpenseExportDialog } from "@/components/expenses/expense-export-dialog";
import { useExpenseFilters, useDebouncedValue } from "@/hooks/use-expense-filters";
import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  type StatusFilter,
} from "./_components/expense-constants";
import { AdminExpenseStats, MemberExpenseStats } from "./_components/expense-stats";
import { AdminExpenseFilters, MemberExpenseFilters } from "./_components/expense-filters";
import { AdminExpenseList, MemberExpenseList } from "./_components/expense-list";
import type { ExpenseToEdit } from "./create-expense-dialog";

/* ─── Page Component ─── */

export default function ExpensesPage() {
  const { data: session } = useSession();
  const [pageData, setPageData] = useState<ExpensePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseToEdit | null>(null);
  const [statusFilter, setStatusFilterState] = useState<StatusFilter>("ALL");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isImportOpen, setIsImportOpen] = useState(false);

  const isAdmin = session?.user?.role === "CEO" || session?.user?.role === "ADMIN" || session?.user?.role === "HR";
  const {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    datePreset,
    setDatePreset,
    setCustomDateRange,
    activeFilterCount,
  } = useExpenseFilters({
    defaultPageSize: isAdmin ? 4 : 5,
    syncToUrl: true,
  });
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const setStatusFilter = useCallback((s: StatusFilter) => {
    setStatusFilterState(s);
    setFilter("status", s === "ALL" ? "all" : s);
  }, [setFilter]);

  const loadData = useCallback(async (currentFilters: typeof filters, showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setLoading(true);
    try {
      const result = await getExpensePageData({ ...currentFilters, search: debouncedSearch });
      if ("error" in result) { toast.error(result.error); return; }
      setPageData(result);
    } catch {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { loadData(filters); }, [filters, loadData]);

  const optimisticUpdate = (expenseId: number, updates: Partial<ExpenseWithRelations>) => {
    if (!pageData) return;
    setPageData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        expenses: prev.expenses.map((e) => e.id === expenseId ? { ...e, ...updates } : e),
        pendingExpenses: prev.pendingExpenses.filter((e) => e.id !== expenseId),
      };
    });
  };

  const handleApprove = async (expenseId: number) => {
    optimisticUpdate(expenseId, { status: "APPROVED" });
    const result = await approveExpense(expenseId);
    if (result.success) toast.success("Expense approved");
    else { toast.error(result.error); loadData(filters); }
  };

  const handleReject = async (expenseId: number) => {
    if (!rejectionReason) return;
    optimisticUpdate(expenseId, { status: "REJECTED", rejectionReason });
    setRejectingId(null);
    const result = await rejectExpense(expenseId, rejectionReason);
    if (result.success) { toast.success("Expense rejected"); setRejectionReason(""); }
    else { toast.error(result.error); loadData(filters); }
  };

  const handleDelete = async (expenseId: number) => {
    if (!pageData) return;
    setPageData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        expenses: prev.expenses.filter((e) => e.id !== expenseId),
        pendingExpenses: prev.pendingExpenses.filter((e) => e.id !== expenseId),
      };
    });
    const result = await deleteExpense(expenseId);
    if (result.success) toast.success("Expense deleted");
    else { toast.error(result.error); loadData(filters); }
  };

  const handleImportSuccess = () => {
    loadData(filters, true);
  };

  const handleEdit = (expense: ExpenseToEdit) => {
    setEditingExpense(expense);
    setIsCreateOpen(true);
  };

  const handleResubmit = (expense: ExpenseWithRelations) => {
    setIsCreateOpen(true);
    toast.info(
      expense.rejectionReason
        ? `Rejected: ${expense.rejectionReason}. Please create a new claim with corrections.`
        : "Please create a new claim with corrections."
    );
  };

  /* ─── Loading State ─── */
  if (loading && !pageData) {
    return (
      <div className="flex-1 space-y-6 px-4 sm:px-6 py-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className={`grid gap-6 ${isAdmin ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
          {Array.from({ length: isAdmin ? 4 : 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const { expenses, pendingExpenses, stats, pagination, categories: expenseCategories } = pageData || {
    expenses: [], pendingExpenses: [], stats: null,
    pagination: { page: 1, pageSize: 5, total: 0, totalPages: 0 },
    categories: [],
  };

  const filteredExpenses = statusFilter === "ALL"
    ? expenses
    : expenses.filter((e) => (e.status || "PENDING") === statusFilter);

  const pendingCount = stats?.pendingCount || pendingExpenses.length || 0;
  const totalPages = pagination.totalPages || 1;
  const startItem = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const endItem = Math.min(pagination.page * pagination.pageSize, pagination.total);

  /* ═══════════════════════════════════════════════════════════
     ADMIN VIEW — Expense Approvals (card-based)
     ═══════════════════════════════════════════════════════════ */
  if (isAdmin) {
    return (
      <PageWrapper
        title="Expense Approvals"
        subtitle="Review and manage pending employee expense claims."
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setIsImportOpen(true)}
            >
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <ExpenseExportDialog
              filters={filters}
              categories={expenseCategories}
              trigger={
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export Report
                </Button>
              }
            />
            <Button
              className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold shadow-sm gap-2"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              New Policy
            </Button>
          </div>
        }
      >
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
          {/* 4 Stats Cards */}
          <motion.div variants={fadeUp}>
            <AdminExpenseStats stats={stats} pendingCount={pendingCount} />
          </motion.div>

          {/* Filter Pills */}
          <motion.div variants={fadeUp}>
            <AdminExpenseFilters
              statusFilter={statusFilter}
              pendingCount={pendingCount}
              onStatusChange={setStatusFilter}
            />
          </motion.div>

          {/* Claims Card List */}
          <motion.div variants={fadeUp}>
            <AdminExpenseList
              expenses={filteredExpenses}
              pagination={pagination}
              startItem={startItem}
              endItem={endItem}
              totalPages={totalPages}
              statusFilter={statusFilter}
              rejectingId={rejectingId}
              rejectionReason={rejectionReason}
              isPending={isPending}
              onApprove={handleApprove}
              onRejectStart={(id) => { setRejectingId(id); setRejectionReason(""); }}
              onRejectConfirm={handleReject}
              onRejectCancel={() => { setRejectingId(null); setRejectionReason(""); }}
              onRejectionReasonChange={setRejectionReason}
              onPageChange={(page) => setFilter("page", page)}
              onShowAll={() => setStatusFilter("ALL")}
            />
          </motion.div>
        </motion.div>

        <CreateExpenseDialog
          open={isCreateOpen} onOpenChange={(v) => { setIsCreateOpen(v); if (!v) setEditingExpense(null); }}
          onSuccess={() => { loadData(filters); setIsCreateOpen(false); setEditingExpense(null); }}
          categories={EXPENSE_CATEGORIES} paymentMethods={PAYMENT_METHODS}
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

  /* ═══════════════════════════════════════════════════════════
     MEMBER VIEW — My Expenses (table-based)
     ═══════════════════════════════════════════════════════════ */
  return (
    <PageWrapper
      title="My Expenses"
      subtitle="Track, manage, and submit your expense claims for reimbursement."
      actions={
        <Button
          className="bg-gold hover:bg-gold/90 text-white font-bold shadow-sm gap-2 rounded-full px-6"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Submit New Claim
        </Button>
      }
    >
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        {/* 3 Stats Cards */}
        <motion.div variants={fadeUp}>
          <MemberExpenseStats stats={stats} />
        </motion.div>

        {/* Filter Tabs + Date Filter */}
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

        {/* Table */}
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
        open={isCreateOpen} onOpenChange={setIsCreateOpen}
        onSuccess={() => { loadData(filters); setIsCreateOpen(false); }}
        categories={EXPENSE_CATEGORIES} paymentMethods={PAYMENT_METHODS}
      />
    </PageWrapper>
  );
}
