"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Plus,
  Receipt,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  MoreHorizontal,
  Eye,
  Trash2,
  TrendingUp,
  Settings,
  BarChart3,
  Download,
  RefreshCw,
  FileImage,
  Plane,
  UtensilsCrossed,
  Car,
  Monitor,
  Armchair,
  BookOpen,
  Megaphone,
  Zap,
  Package,
  RotateCcw,
} from "lucide-react";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";
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
  ExpenseFilters,
  ExpenseWithRelations,
} from "@/server/actions/expense-query";
import { CreateExpenseDialog } from "./create-expense-dialog";
import { BudgetManagement } from "./budget-management";
import { ExpenseReports } from "./expense-reports";
import { ExpenseFilterBar } from "@/components/expenses/expense-filter-bar";
import { ExpenseExportDialog } from "@/components/expenses/expense-export-dialog";
import { ReceiptViewer } from "@/components/expenses/receipt-viewer";
import { ExpensePagination } from "@/components/expenses/expense-pagination";
import { useExpenseFilters, useDebouncedValue } from "@/hooks/use-expense-filters";
import { useSession } from "next-auth/react";
import { downloadFile } from "@/hooks/use-file-url";
import { PageHeader } from "@/components/ui/page-header";
import { getColorSafe, expenseStatusColors } from "@/lib/theme-constants";
import { formatINR } from "@/lib/format-utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";

/* ─── Category icon + color mapping ─── */

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; bg: string; text: string }> = {
  Travel:          { icon: Plane,              bg: "bg-blue-50 dark:bg-blue-900/20",     text: "text-blue-700 dark:text-blue-400" },
  Meals:           { icon: UtensilsCrossed,    bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-700 dark:text-orange-400" },
  Transport:       { icon: Car,                bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-700 dark:text-purple-400" },
  Software:        { icon: Monitor,            bg: "bg-teal-50 dark:bg-teal-900/20",     text: "text-teal-700 dark:text-teal-400" },
  "Office Supplies": { icon: Armchair,         bg: "bg-gray-100 dark:bg-gray-800/30",    text: "text-gray-700 dark:text-gray-400" },
  Equipment:       { icon: Package,            bg: "bg-indigo-50 dark:bg-indigo-900/20", text: "text-indigo-700 dark:text-indigo-400" },
  Training:        { icon: BookOpen,           bg: "bg-cyan-50 dark:bg-cyan-900/20",     text: "text-cyan-700 dark:text-cyan-400" },
  Marketing:       { icon: Megaphone,          bg: "bg-pink-50 dark:bg-pink-900/20",     text: "text-pink-700 dark:text-pink-400" },
  Utilities:       { icon: Zap,                bg: "bg-amber-50 dark:bg-amber-900/20",   text: "text-amber-700 dark:text-amber-400" },
};

const DEFAULT_CATEGORY = { icon: Receipt, bg: "bg-slate-100 dark:bg-slate-800/30", text: "text-slate-700 dark:text-slate-400" };

function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] || DEFAULT_CATEGORY;
}

/* ─── Status badge styles (redesigned with dots) ─── */

const STATUS_STYLES: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  PENDING:  { dot: "bg-amber-500",   bg: "bg-amber-50 dark:bg-amber-900/20",    text: "text-amber-700 dark:text-amber-400",   border: "border-amber-100 dark:border-amber-800" },
  APPROVED: { dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-100 dark:border-emerald-800" },
  REJECTED: { dot: "bg-red-500",     bg: "bg-red-50 dark:bg-red-900/20",         text: "text-red-700 dark:text-red-400",         border: "border-red-100 dark:border-red-800" },
  PAID:     { dot: "bg-slate-500",   bg: "bg-slate-100 dark:bg-slate-800/20",    text: "text-slate-600 dark:text-slate-400",     border: "border-slate-200 dark:border-slate-700" },
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PAID: "Paid",
};

/* ─── Constants ─── */

const EXPENSE_CATEGORIES = [
  "Travel", "Meals", "Office Supplies", "Software",
  "Equipment", "Training", "Marketing", "Utilities", "Other",
];

const PAYMENT_METHODS = [
  "Cash", "Company Card", "Personal Card", "Bank Transfer", "UPI",
  "Online", "Offline", "Cheque", "NEFT", "IMPS",
  "Debit Card", "Credit Card", "Wallet", "Demand Draft", "Other",
];

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "PAID";

/* ─── Page Component ─── */

export default function ExpensesPage() {
  const { data: session } = useSession();
  const [pageData, setPageData] = useState<ExpensePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseWithRelations | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [isPending, startTransition] = useTransition();

  const isAdmin = session?.user?.role === "OWNER" || session?.user?.role === "ADMIN";
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
    defaultPageSize: 50,
    syncToUrl: true,
  });
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const loadData = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const result = await getExpensePageData({
        ...filters,
        search: debouncedSearch,
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setPageData(result);
    } catch {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [filters, debouncedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const optimisticUpdate = (
    expenseId: number,
    updates: Partial<ExpenseWithRelations>
  ) => {
    if (!pageData) return;
    setPageData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        expenses: prev.expenses.map((e) =>
          e.id === expenseId ? { ...e, ...updates } : e
        ),
        pendingExpenses: prev.pendingExpenses.filter((e) => e.id !== expenseId),
      };
    });
  };

  const handleApprove = async (expenseId: number) => {
    optimisticUpdate(expenseId, { status: "APPROVED" });
    const result = await approveExpense(expenseId);
    if (result.success) {
      toast.success("Expense approved");
    } else {
      toast.error(result.error);
      loadData();
    }
  };

  const handleReject = async () => {
    if (!selectedExpense || !rejectionReason) return;
    optimisticUpdate(selectedExpense.id, {
      status: "REJECTED",
      rejectionReason,
    });
    setIsRejectDialogOpen(false);
    const result = await rejectExpense(selectedExpense.id, rejectionReason);
    if (result.success) {
      toast.success("Expense rejected");
      setRejectionReason("");
      setSelectedExpense(null);
    } else {
      toast.error(result.error);
      loadData();
    }
  };

  const handleMarkPaid = async (expenseId: number) => {
    optimisticUpdate(expenseId, { status: "PAID" });
    const result = await markExpenseAsPaid(expenseId);
    if (result.success) {
      toast.success("Expense marked as paid");
    } else {
      toast.error(result.error);
      loadData();
    }
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
    if (result.success) {
      toast.success("Expense deleted");
    } else {
      toast.error(result.error);
      loadData();
    }
  };

  const formatCurrency = formatINR;

  /* ─── Loading State ─── */

  if (loading && !pageData) {
    return (
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const { expenses, pendingExpenses, stats, categories, pagination } = pageData || {
    expenses: [],
    pendingExpenses: [],
    stats: null,
    categories: [],
    pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
  };

  /* Filter expenses by status tab */
  const filteredExpenses = statusFilter === "ALL"
    ? expenses
    : expenses.filter((e) => (e.status || "PENDING") === statusFilter);

  return (
    <div className="flex-1 space-y-6">
      {/* ─── Page Header ─── */}
      <PageHeader
        title="My Expenses"
        description="Track, manage, and submit your expense claims for reimbursement."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              aria-label="Refresh expenses"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button
              className="bg-[#bd882c] hover:bg-[#a67724] text-white font-bold shadow-sm"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Submit New Claim
            </Button>
          </div>
        }
      />

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        {/* ─── Stats Cards (3) ─── */}
        <motion.div variants={fadeUp}>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Total Reimbursed */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-[11px] font-medium bg-muted px-2 py-1 rounded text-muted-foreground">YTD</span>
                </div>
                <p className="text-sm font-medium text-muted-foreground">Total Reimbursed</p>
                <p className="text-3xl font-bold mt-1">
                  {formatCurrency((stats?.approvedAmount || 0) + (stats?.paidAmount || 0))}
                </p>
              </CardContent>
            </Card>

            {/* Pending Approval */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-[#bd882c]/10 rounded-lg">
                    <Clock className="h-5 w-5 text-[#bd882c]" />
                  </div>
                  <span className="text-[11px] font-medium bg-muted px-2 py-1 rounded text-muted-foreground">Current</span>
                </div>
                <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
                <p className="text-3xl font-bold mt-1">
                  {formatCurrency(stats?.pendingAmount || 0)}
                </p>
              </CardContent>
            </Card>

            {/* Rejected Claims */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <XCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
                  </div>
                  <span className="text-[11px] font-medium bg-muted px-2 py-1 rounded text-muted-foreground">Last 30 Days</span>
                </div>
                <p className="text-sm font-medium text-muted-foreground">Rejected Claims</p>
                <p className="text-3xl font-bold mt-1">
                  {formatCurrency(stats?.rejectedAmount || 0)}
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* ─── Tabs: Claims / Reports / Budgets ─── */}
        <motion.div variants={fadeUp}>
          <Tabs
            defaultValue="claims"
            className="space-y-6"
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <TabsList className="bg-transparent p-0 h-auto gap-1">
                <TabsTrigger value="claims" className="data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-lg">
                  {isAdmin ? "All Claims" : "My Claims"}
                </TabsTrigger>
                {isAdmin && (
                  <TabsTrigger value="pending" className="data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-lg">
                    Pending ({pendingExpenses.length})
                  </TabsTrigger>
                )}
                <TabsTrigger value="reports" className="data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-lg">
                  <BarChart3 className="h-4 w-4 mr-1.5" />
                  Reports
                </TabsTrigger>
                {isAdmin && (
                  <TabsTrigger value="budgets" className="data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-lg">
                    <Settings className="h-4 w-4 mr-1.5" />
                    Budgets
                  </TabsTrigger>
                )}
              </TabsList>
              <div className="flex items-center gap-2">
                <ExpenseExportDialog filters={filters} />
              </div>
            </div>

            {/* ──── Claims Tab ──── */}
            <TabsContent value="claims" className="space-y-4 mt-0">
              {/* Status filter pills + date filter */}
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-1 bg-muted p-1 rounded-lg" role="tablist" aria-label="Filter by status">
                  {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
                    <button
                      key={s}
                      role="tab"
                      aria-selected={statusFilter === s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        statusFilter === s
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s === "ALL" ? "All Claims" : STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={datePreset}
                    onValueChange={setDatePreset}
                  >
                    <SelectTrigger className="h-9 w-[160px] text-sm">
                      <SelectValue placeholder="Filter by Date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="last_month">Last Month</SelectItem>
                      <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                      <SelectItem value="this_year">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                  <ExpenseExportDialog
                    filters={filters}
                    trigger={
                      <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Download report">
                        <Download className="h-4 w-4" />
                      </Button>
                    }
                  />
                </div>
              </div>

              {/* Table */}
              <Card className="overflow-hidden shadow-sm">
                <CardContent className="p-0" aria-live="polite">
                  {filteredExpenses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <EmptyExpensesIllustration className="mb-3" />
                      <h3 className="text-lg font-medium">No expenses found</h3>
                      <p className="text-muted-foreground mb-4">
                        {statusFilter !== "ALL" || activeFilterCount > 0
                          ? "Try adjusting your filters"
                          : "Submit your first expense claim to get started"}
                      </p>
                      {statusFilter !== "ALL" ? (
                        <Button variant="outline" onClick={() => setStatusFilter("ALL")}>
                          Show All Claims
                        </Button>
                      ) : (
                        <Button
                          className="bg-[#bd882c] hover:bg-[#a67724] text-white"
                          onClick={() => setIsCreateOpen(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Submit New Claim
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <Table>
                          <caption className="sr-only">Expense claims</caption>
                          <TableHeader>
                            <TableRow className="bg-muted/30">
                              <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Claim ID</TableHead>
                              <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Date</TableHead>
                              <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Category</TableHead>
                              <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Description</TableHead>
                              <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Amount</TableHead>
                              <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Status</TableHead>
                              <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4 text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredExpenses.map((expense) => {
                              const status = expense.status || "PENDING";
                              const catConfig = getCategoryConfig(expense.category || "Other");
                              const CatIcon = catConfig.icon;
                              const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.PENDING;
                              const canEdit = status === "PENDING";
                              const canResubmit = status === "REJECTED";

                              return (
                                <TableRow key={expense.id} className="hover:bg-muted/30 transition-colors">
                                  <TableCell className="px-6 py-4 text-sm font-medium">
                                    #EXP-{expense.id.toString().padStart(3, "0")}
                                  </TableCell>
                                  <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                                    {format(new Date(expense.expenseDate), "MMM dd, yyyy")}
                                  </TableCell>
                                  <TableCell className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${catConfig.bg} ${catConfig.text}`}>
                                      <CatIcon className="h-3.5 w-3.5" />
                                      {expense.category || "Other"}
                                    </span>
                                  </TableCell>
                                  <TableCell className="px-6 py-4 text-sm max-w-[200px] truncate">
                                    {expense.description || expense.merchant || "-"}
                                  </TableCell>
                                  <TableCell className="px-6 py-4 text-sm font-bold">
                                    {formatCurrency(expense.amount)}
                                  </TableCell>
                                  <TableCell className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                                      {status === "PAID" ? (
                                        <CheckCircle2 className="h-3 w-3" />
                                      ) : status === "REJECTED" ? (
                                        <XCircle className="h-3 w-3" />
                                      ) : (
                                        <span className={`size-1.5 rounded-full ${statusStyle.dot}`} />
                                      )}
                                      {STATUS_LABELS[status] || status}
                                    </span>
                                  </TableCell>
                                  <TableCell className="px-6 py-4 text-right">
                                    {canResubmit ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs text-[#bd882c] border-[#bd882c]/20 hover:bg-[#bd882c]/5"
                                        onClick={() => {
                                          toast.info("Resubmit coming soon");
                                        }}
                                      >
                                        <RotateCcw className="mr-1 h-3 w-3" />
                                        Resubmit
                                      </Button>
                                    ) : (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                            {canEdit ? (
                                              <MoreHorizontal className="h-4 w-4" />
                                            ) : (
                                              <Eye className="h-4 w-4" />
                                            )}
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          {expense.receiptUrl && (
                                            <>
                                              <DropdownMenuItem asChild>
                                                <ReceiptViewer
                                                  receiptUrl={expense.receiptUrl}
                                                  fileName={expense.receiptFileName || undefined}
                                                  expenseId={expense.id}
                                                  trigger={
                                                    <div className="flex items-center cursor-pointer px-2 py-1.5 text-sm w-full">
                                                      <Eye className="mr-2 h-4 w-4" />
                                                      View Receipt
                                                    </div>
                                                  }
                                                />
                                              </DropdownMenuItem>
                                              <DropdownMenuItem
                                                onClick={() => downloadFile(
                                                  expense.receiptUrl!,
                                                  expense.receiptFileName || `receipt-${expense.id}`
                                                )}
                                              >
                                                <Download className="mr-2 h-4 w-4" />
                                                Download Receipt
                                              </DropdownMenuItem>
                                            </>
                                          )}
                                          {isAdmin && status === "APPROVED" && (
                                            <DropdownMenuItem onClick={() => handleMarkPaid(expense.id)}>
                                              <DollarSign className="mr-2 h-4 w-4" />
                                              Mark as Paid
                                            </DropdownMenuItem>
                                          )}
                                          {(canEdit || isAdmin) && (
                                            <>
                                              <DropdownMenuSeparator />
                                              <DropdownMenuItem
                                                onClick={() => handleDelete(expense.id)}
                                                className="text-destructive"
                                              >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                              </DropdownMenuItem>
                                            </>
                                          )}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Pagination */}
                      <ExpensePagination
                        page={pagination.page}
                        pageSize={pagination.pageSize}
                        total={pagination.total}
                        totalPages={pagination.totalPages}
                        onPageChange={(page) => setFilter("page", page)}
                        onPageSizeChange={(pageSize) => setFilter("pageSize", pageSize)}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ──── Pending Approvals Tab (Admin) ──── */}
            {isAdmin && (
              <TabsContent value="pending" className="space-y-4 mt-0">
                <Card className="overflow-hidden shadow-sm">
                  <CardContent className="p-0" aria-live="polite">
                    {pendingExpenses.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16">
                        <EmptyExpensesIllustration className="mb-3" />
                        <h3 className="text-lg font-medium">All caught up!</h3>
                        <p className="text-muted-foreground">No pending expense claims to review</p>
                      </div>
                    ) : (
                      <Table>
                        <caption className="sr-only">Pending expense claims awaiting approval</caption>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Employee</TableHead>
                            <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Category</TableHead>
                            <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Description</TableHead>
                            <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Date</TableHead>
                            <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4 text-right">Amount</TableHead>
                            <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Receipt</TableHead>
                            <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4 text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingExpenses.map((expense) => {
                            const catConfig = getCategoryConfig(expense.category || "Other");
                            const CatIcon = catConfig.icon;
                            return (
                              <TableRow key={expense.id} className="hover:bg-muted/30 transition-colors">
                                <TableCell className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                      <AvatarImage src={resolveImageUrl(expense.user?.image)} />
                                      <AvatarFallback className="text-xs">
                                        {expense.user?.firstName?.[0]}
                                        {expense.user?.lastName?.[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium text-sm">
                                        {expense.user?.firstName} {expense.user?.lastName}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {expense.user?.email}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${catConfig.bg} ${catConfig.text}`}>
                                    <CatIcon className="h-3.5 w-3.5" />
                                    {expense.category}
                                  </span>
                                </TableCell>
                                <TableCell className="px-6 py-4 max-w-[200px] truncate text-sm text-muted-foreground">
                                  {expense.description || "-"}
                                </TableCell>
                                <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                                  {format(new Date(expense.expenseDate), "MMM dd, yyyy")}
                                </TableCell>
                                <TableCell className="px-6 py-4 text-right font-bold text-sm">
                                  {formatCurrency(expense.amount)}
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                  {expense.receiptUrl ? (
                                    <ReceiptViewer
                                      receiptUrl={expense.receiptUrl}
                                      fileName={expense.receiptFileName || undefined}
                                      expenseId={expense.id}
                                    />
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="px-6 py-4 text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button size="sm" className="h-8" onClick={() => handleApprove(expense.id)}>
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8"
                                      onClick={() => {
                                        setSelectedExpense(expense);
                                        setIsRejectDialogOpen(true);
                                      }}
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* ──── Reports Tab ──── */}
            <TabsContent value="reports" className="space-y-4 mt-0">
              <ExpenseReports isAdmin={isAdmin} />
            </TabsContent>

            {/* ──── Budgets Tab (Admin) ──── */}
            {isAdmin && (
              <TabsContent value="budgets" className="space-y-4 mt-0">
                <BudgetManagement />
              </TabsContent>
            )}
          </Tabs>
        </motion.div>
      </motion.div>

      {/* ─── Create Expense Dialog ─── */}
      <CreateExpenseDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          loadData();
          setIsCreateOpen(false);
        }}
        categories={EXPENSE_CATEGORIES}
        paymentMethods={PAYMENT_METHODS}
      />

      {/* ─── Reject Dialog ─── */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting this expense claim.
            </p>
            <Input
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              aria-label="Rejection reason"
              aria-required="true"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={!rejectionReason}
              variant="destructive"
            >
              Reject
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
