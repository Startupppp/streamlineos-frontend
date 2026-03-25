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
  Download,
  Plane,
  UtensilsCrossed,
  Car,
  Monitor,
  Armchair,
  BookOpen,
  Megaphone,
  Zap,
  Package,
  BarChart3,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Eye,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { viewFile, downloadFile } from "@/hooks/use-file-url";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
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
import { ExpenseExportDialog } from "@/components/expenses/expense-export-dialog";
import { useExpenseFilters, useDebouncedValue } from "@/hooks/use-expense-filters";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/ui/page-header";
import { formatINR, formatINRCompact } from "@/lib/format-utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";

/* ─── Category icon + color mapping ─── */

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; label: string; bg: string; text: string }> = {
  Travel:            { icon: Plane,           label: "Travel",    bg: "bg-blue-50 dark:bg-blue-900/20",     text: "text-blue-600 dark:text-blue-400" },
  Meals:             { icon: UtensilsCrossed, label: "Meals",     bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-600 dark:text-orange-400" },
  Transport:         { icon: Car,             label: "Transport", bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-600 dark:text-purple-400" },
  Software:          { icon: Monitor,         label: "Software",  bg: "bg-teal-50 dark:bg-teal-900/20",     text: "text-teal-600 dark:text-teal-400" },
  "Office Supplies": { icon: Armchair,        label: "Office",    bg: "bg-gray-100 dark:bg-gray-800/30",    text: "text-gray-600 dark:text-gray-400" },
  Equipment:         { icon: Package,         label: "Equipment", bg: "bg-indigo-50 dark:bg-indigo-900/20", text: "text-indigo-600 dark:text-indigo-400" },
  Training:          { icon: BookOpen,        label: "Training",  bg: "bg-cyan-50 dark:bg-cyan-900/20",     text: "text-cyan-600 dark:text-cyan-400" },
  Marketing:         { icon: Megaphone,       label: "Marketing", bg: "bg-pink-50 dark:bg-pink-900/20",     text: "text-pink-600 dark:text-pink-400" },
  Utilities:         { icon: Zap,             label: "Utilities", bg: "bg-amber-50 dark:bg-amber-900/20",   text: "text-amber-600 dark:text-amber-400" },
};

/* Admin card view uses longer labels */
const ADMIN_CATEGORY_LABELS: Record<string, string> = {
  Travel: "Travel & Transport",
  Meals: "Meals & Entertainment",
  Transport: "Travel & Transport",
  Software: "Software & Tools",
  "Office Supplies": "Office Supplies",
};

const DEFAULT_CATEGORY = { icon: Receipt, label: "Other", bg: "bg-slate-100 dark:bg-slate-800/30", text: "text-slate-600 dark:text-slate-400" };

function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] || DEFAULT_CATEGORY;
}

/* ─── Status styles ─── */

const STATUS_STYLES: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  PENDING:  { dot: "bg-amber-500",   bg: "bg-amber-50 dark:bg-amber-900/20",    text: "text-amber-700 dark:text-amber-400",   border: "border-amber-200 dark:border-amber-800" },
  APPROVED: { dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800" },
  REJECTED: { dot: "bg-red-500",     bg: "bg-red-50 dark:bg-red-900/20",         text: "text-red-700 dark:text-red-400",         border: "border-red-200 dark:border-red-800" },
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

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

/* ─── Page Component ─── */

export default function ExpensesPage() {
  const { data: session } = useSession();
  const [pageData, setPageData] = useState<ExpensePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<import("./create-expense-dialog").ExpenseToEdit | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isPending, startTransition] = useTransition();

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

  const loadData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setLoading(true);
    try {
      const result = await getExpensePageData({ ...filters, search: debouncedSearch });
      if ("error" in result) { toast.error(result.error); return; }
      setPageData(result);
    } catch {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [filters, debouncedSearch]);

  useEffect(() => { loadData(); }, [loadData]);

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
    else { toast.error(result.error); loadData(); }
  };

  const handleReject = async (expenseId: number) => {
    if (!rejectionReason) return;
    optimisticUpdate(expenseId, { status: "REJECTED", rejectionReason });
    setRejectingId(null);
    const result = await rejectExpense(expenseId, rejectionReason);
    if (result.success) { toast.success("Expense rejected"); setRejectionReason(""); }
    else { toast.error(result.error); loadData(); }
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
    else { toast.error(result.error); loadData(); }
  };

  /* ─── Loading State ─── */
  if (loading && !pageData) {
    return (
      <div className="flex-1 space-y-6">
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

  const { expenses, pendingExpenses, stats, pagination } = pageData || {
    expenses: [], pendingExpenses: [], stats: null,
    pagination: { page: 1, pageSize: 5, total: 0, totalPages: 0 },
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
      <div className="flex-1 space-y-6">
        <PageHeader
          title="Expense Approvals"
          description="Review and manage pending employee expense claims."
          actions={
            <div className="flex items-center gap-3">
              <ExpenseExportDialog
                filters={filters}
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
        />

        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
          {/* 4 Stats Cards */}
          <motion.div variants={fadeUp}>
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
              <Card className="shadow-sm hover:shadow-md transition-shadow border">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <span className="text-xs sm:text-sm text-muted-foreground font-medium">Pending Approval</span>
                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                      <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold">{pendingCount}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Awaiting review</p>
                </CardContent>
              </Card>

              <Card className="shadow-sm hover:shadow-md transition-shadow border">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <span className="text-xs sm:text-sm text-muted-foreground font-medium">Approved Today</span>
                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold truncate" title={formatINR(stats?.approvedAmount || 0)}>{formatINRCompact(stats?.approvedAmount || 0)}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Approved today</p>
                </CardContent>
              </Card>

              <Card className="shadow-sm hover:shadow-md transition-shadow border">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <span className="text-xs sm:text-sm text-muted-foreground font-medium">Rejected Today</span>
                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                      <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold truncate" title={formatINR(stats?.rejectedAmount || 0)}>{formatINRCompact(stats?.rejectedAmount || 0)}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Rejected today</p>
                </CardContent>
              </Card>

              <Card className="shadow-sm hover:shadow-md transition-shadow border col-span-2 lg:col-span-1">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <span className="text-xs sm:text-sm text-muted-foreground font-medium">Total Claimed (Month)</span>
                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                      <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold truncate" title={formatINR((stats?.approvedAmount || 0) + (stats?.pendingAmount || 0) + (stats?.rejectedAmount || 0) + (stats?.paidAmount || 0))}>
                    {formatINRCompact((stats?.approvedAmount || 0) + (stats?.pendingAmount || 0) + (stats?.rejectedAmount || 0) + (stats?.paidAmount || 0))}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">This month total</p>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Filter Pills */}
          <motion.div variants={fadeUp}>
            <div className="flex flex-wrap items-center gap-2">
              {([
                { key: "ALL" as StatusFilter, label: "All Claims", count: null },
                { key: "PENDING" as StatusFilter, label: "Pending", count: pendingCount },
                { key: "APPROVED" as StatusFilter, label: "Approved", count: null },
                { key: "REJECTED" as StatusFilter, label: "Rejected", count: null },
              ]).map((item) => (
                <button
                  key={item.key}
                  onClick={() => setStatusFilter(item.key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                    statusFilter === item.key
                      ? "bg-[#1e293b] dark:bg-white text-white dark:text-[#1e293b] border-[#1e293b] dark:border-white"
                      : "bg-white dark:bg-background text-muted-foreground border-border hover:border-foreground/20 hover:bg-muted/50"
                  }`}
                >
                  {item.label}
                  {item.count !== null && (
                    <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                      statusFilter === item.key ? "bg-white/20 dark:bg-black/20" : "bg-muted"
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Claims Card List */}
          <motion.div variants={fadeUp}>
            <Card className="shadow-sm border">
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                  <h3 className="text-base font-semibold">Recent Claims</h3>
                  <span className="text-sm text-muted-foreground">
                    Showing {startItem}-{endItem} of {pagination.total} {statusFilter === "PENDING" ? "pending" : "total"}
                  </span>
                </div>

                {filteredExpenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <EmptyExpensesIllustration className="mb-3" />
                    <h3 className="text-lg font-medium">No expenses found</h3>
                    <p className="text-muted-foreground mb-4">
                      {statusFilter !== "ALL" ? "Try adjusting your filters" : "No expense claims to review"}
                    </p>
                    {statusFilter !== "ALL" && (
                      <Button variant="outline" onClick={() => setStatusFilter("ALL")}>Show All Claims</Button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredExpenses.map((expense) => {
                      const status = expense.status || "PENDING";
                      const catConfig = getCategoryConfig(expense.category || "Other");
                      const CatIcon = catConfig.icon;
                      const isRejecting = rejectingId === expense.id;
                      const adminCatLabel = ADMIN_CATEGORY_LABELS[expense.category || ""] || catConfig.label;

                      return (
                        <div key={expense.id} className="flex items-start gap-5 px-6 py-5 hover:bg-muted/20 transition-colors">
                          {/* Receipt Thumbnail */}
                          <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
                            <div
                              className={cn(
                                "w-[100px] h-[80px] rounded-lg bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/20 dark:to-rose-800/20 flex items-center justify-center overflow-hidden border border-rose-200/50 dark:border-rose-800/30",
                                expense.receiptUrl && "cursor-pointer hover:ring-2 hover:ring-[#bd882c]/40 transition-all"
                              )}
                              onClick={() => expense.receiptUrl && viewFile(expense.receiptUrl)}
                            >
                              {expense.receiptUrl ? (
                                <img
                                  src={resolveImageUrl(expense.receiptUrl) || ""}
                                  alt="Receipt"
                                  className="w-full h-full object-cover rounded-lg"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                />
                              ) : (
                                <Receipt className="h-7 w-7 text-rose-400" />
                              )}
                            </div>
                            {expense.receiptUrl && (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => viewFile(expense.receiptUrl!)}
                                  aria-label="View receipt"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => downloadFile(expense.receiptUrl!, expense.receiptFileName || "receipt")}
                                  aria-label="Download receipt"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Claim Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                                  status === "PENDING"
                                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                                    : status === "APPROVED"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                                    : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                                }`}
                              >
                                {status === "PENDING" ? "Pending Review" : status === "APPROVED" ? "Approved" : "Rejected"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                #EXP-{new Date(expense.expenseDate).getFullYear()}-{expense.id.toString().padStart(3, "0")}
                              </span>
                            </div>
                            <h4 className="font-semibold text-[15px] text-foreground mb-0.5">
                              {expense.merchant || expense.description || "Expense Claim"}
                            </h4>
                            <p className="text-sm text-muted-foreground line-clamp-1 mb-2.5">
                              {expense.description || "-"}
                            </p>
                            <div className="flex items-center gap-2 text-sm flex-wrap">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={resolveImageUrl(expense.user?.image)} />
                                <AvatarFallback className="text-[10px] bg-muted">
                                  {expense.user?.firstName?.[0]}{expense.user?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-foreground text-sm">
                                {expense.user?.firstName} {expense.user?.lastName}
                              </span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-muted-foreground text-sm">{expense.category || "General"}</span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-muted-foreground text-sm">
                                {format(new Date(expense.expenseDate), "MMM dd, yyyy")}
                              </span>
                            </div>
                          </div>

                          {/* Category */}
                          <div className="text-right min-w-[130px] flex-shrink-0 hidden lg:block">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Category</p>
                            <div className="flex items-center gap-1.5 justify-end">
                              <CatIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{adminCatLabel}</span>
                            </div>
                            {expense.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[130px]">{expense.description}</p>
                            )}
                          </div>

                          {/* Amount + Actions */}
                          <div className="text-right min-w-[150px] flex-shrink-0">
                            <p className="text-2xl font-bold text-foreground">{formatINR(expense.amount)}</p>
                            <p className="text-xs text-muted-foreground mb-3">INR</p>

                            {isRejecting ? (
                              <div className="space-y-2 text-left">
                                <Input
                                  placeholder="Reason for rejection (required)..."
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  className="text-sm h-9"
                                />
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" size="sm" className="h-8 text-xs"
                                    onClick={() => { setRejectingId(null); setRejectionReason(""); }}>
                                    Cancel
                                  </Button>
                                  <Button size="sm" variant="destructive" className="h-8 text-xs"
                                    disabled={!rejectionReason} onClick={() => handleReject(expense.id)}>
                                    Confirm Reject
                                  </Button>
                                </div>
                              </div>
                            ) : status === "PENDING" ? (
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm"
                                  className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                                  onClick={() => { setRejectingId(expense.id); setRejectionReason(""); }}>
                                  Reject
                                </Button>
                                <Button size="sm" className="h-8 text-xs bg-[#1e293b] hover:bg-[#0f172a] text-white dark:bg-white dark:text-[#1e293b] dark:hover:bg-gray-200"
                                  onClick={() => handleApprove(expense.id)} disabled={isPending}>
                                  Approve
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pagination */}
                {pagination.total > 0 && totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/10">
                    <span className="text-sm text-muted-foreground">
                      Showing <strong className="text-foreground">{startItem}</strong> to{" "}
                      <strong className="text-foreground">{endItem}</strong> of{" "}
                      <strong className="text-foreground">{pagination.total}</strong> results
                    </span>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" disabled={pagination.page <= 1}
                        onClick={() => setFilter("page", pagination.page - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {(() => {
                        const maxVisible = 5;
                        let start = Math.max(1, pagination.page - Math.floor(maxVisible / 2));
                        const end = Math.min(totalPages, start + maxVisible - 1);
                        start = Math.max(1, end - maxVisible + 1);
                        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
                      })().map((p) => (
                        <Button key={p} variant={p === pagination.page ? "default" : "outline"} size="icon"
                          className={`h-8 w-8 text-xs ${p === pagination.page ? "bg-[#2563eb] hover:bg-[#1d4ed8] text-white" : ""}`}
                          onClick={() => setFilter("page", p)}>
                          {p}
                        </Button>
                      ))}
                      <Button variant="outline" size="icon" className="h-8 w-8" disabled={pagination.page >= totalPages}
                        onClick={() => setFilter("page", pagination.page + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <CreateExpenseDialog
          open={isCreateOpen} onOpenChange={(v) => { setIsCreateOpen(v); if (!v) setEditingExpense(null); }}
          onSuccess={() => { loadData(); setIsCreateOpen(false); setEditingExpense(null); }}
          categories={EXPENSE_CATEGORIES} paymentMethods={PAYMENT_METHODS}
          editExpense={editingExpense}
        />
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     MEMBER VIEW — My Expenses (table-based)
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className="flex-1 space-y-6">
      <PageHeader
        title="My Expenses"
        description="Track, manage, and submit your expense claims for reimbursement."
        actions={
          <Button
            className="bg-[#bd882c] hover:bg-[#a67724] text-white font-bold shadow-sm gap-2 rounded-full px-6"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Submit New Claim
          </Button>
        }
      />

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        {/* 3 Stats Cards */}
        <motion.div variants={fadeUp}>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="shadow-sm hover:shadow-md transition-shadow border">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-[11px] font-medium bg-muted px-2 py-1 rounded text-muted-foreground">YTD</span>
                </div>
                <p className="text-sm font-medium text-muted-foreground">Total Reimbursed</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1 truncate" title={formatINR((stats?.approvedAmount || 0) + (stats?.paidAmount || 0))}>
                  {formatINRCompact((stats?.approvedAmount || 0) + (stats?.paidAmount || 0))}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow border">
              <CardContent className="p-4 sm:p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-[#bd882c]/10 rounded-lg">
                    <Clock className="h-5 w-5 text-[#bd882c]" />
                  </div>
                  <span className="text-[11px] font-medium bg-muted px-2 py-1 rounded text-muted-foreground">Current</span>
                </div>
                <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1 truncate" title={formatINR(stats?.pendingAmount || 0)}>{formatINRCompact(stats?.pendingAmount || 0)}</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow border">
              <CardContent className="p-4 sm:p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <XCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
                  </div>
                  <span className="text-[11px] font-medium bg-muted px-2 py-1 rounded text-muted-foreground">Last 30 Days</span>
                </div>
                <p className="text-sm font-medium text-muted-foreground">Rejected Claims</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1 truncate" title={formatINR(stats?.rejectedAmount || 0)}>{formatINRCompact(stats?.rejectedAmount || 0)}</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Filter Tabs + Date Filter */}
        <motion.div variants={fadeUp}>
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg" role="tablist" aria-label="Filter by status">
              {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((s, i, arr) => (
                <button
                  key={s}
                  role="tab"
                  aria-selected={statusFilter === s}
                  tabIndex={statusFilter === s ? 0 : -1}
                  onClick={() => setStatusFilter(s)}
                  onKeyDown={(e) => {
                    let nextIdx = i;
                    if (e.key === "ArrowRight") nextIdx = (i + 1) % arr.length;
                    else if (e.key === "ArrowLeft") nextIdx = (i - 1 + arr.length) % arr.length;
                    else return;
                    e.preventDefault();
                    setStatusFilter(arr[nextIdx]);
                    (e.currentTarget.parentElement?.children[nextIdx] as HTMLElement)?.focus();
                  }}
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
              <Select value={datePreset} onValueChange={setDatePreset}>
                <SelectTrigger className="h-9 w-[160px] text-sm" aria-label="Filter expenses by date range">
                  <Filter className="h-3.5 w-3.5 mr-1.5" />
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
        </motion.div>

        {/* Table */}
        <motion.div variants={fadeUp}>
          <Card className="overflow-hidden shadow-sm border">
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
                    <Button variant="outline" onClick={() => setStatusFilter("ALL")}>Show All Claims</Button>
                  ) : (
                    <Button className="bg-[#bd882c] hover:bg-[#a67724] text-white" onClick={() => setIsCreateOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Submit New Claim
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto" role="region" aria-label="Expense claims table" tabIndex={0}>
                    <Table>
                      <caption className="sr-only">Expense claims</caption>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead scope="col" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Claim ID</TableHead>
                          <TableHead scope="col" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Date</TableHead>
                          <TableHead scope="col" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Category</TableHead>
                          <TableHead scope="col" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Description</TableHead>
                          <TableHead scope="col" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Amount</TableHead>
                          <TableHead scope="col" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Status</TableHead>
                          <TableHead scope="col" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4 text-right">Action</TableHead>
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
                                #EXP-{new Date(expense.expenseDate).getFullYear()}-{expense.id.toString().padStart(3, "0")}
                              </TableCell>
                              <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                                {format(new Date(expense.expenseDate), "MMM dd, yyyy")}
                              </TableCell>
                              <TableCell className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${catConfig.bg} ${catConfig.text}`}>
                                  <CatIcon className="h-3.5 w-3.5" />
                                  {catConfig.label}
                                </span>
                              </TableCell>
                              <TableCell className="px-6 py-4 text-sm max-w-[200px] truncate">
                                {expense.description || expense.merchant || "-"}
                              </TableCell>
                              <TableCell className="px-6 py-4 text-sm font-bold">
                                {formatINR(expense.amount)}
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
                                      setIsCreateOpen(true);
                                      toast.info(
                                        expense.rejectionReason
                                          ? `Rejected: ${expense.rejectionReason}. Please create a new claim with corrections.`
                                          : "Please create a new claim with corrections."
                                      );
                                    }}
                                  >
                                    Resubmit
                                  </Button>
                                ) : canEdit ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-[#bd882c] hover:text-[#a67724]"
                                    onClick={() => {
                                      setEditingExpense({
                                        id: expense.id,
                                        category: expense.category || "",
                                        amount: expense.amount,
                                        description: expense.description,
                                        merchant: expense.merchant,
                                        paymentMethod: expense.paymentMethod,
                                        expenseDate: expense.expenseDate,
                                        receiptUrl: expense.receiptUrl,
                                        receiptFileName: expense.receiptFileName,
                                      });
                                      setIsCreateOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                      if (expense.receiptUrl) {
                                        viewFile(expense.receiptUrl);
                                      } else {
                                        setEditingExpense({
                                          id: expense.id,
                                          category: expense.category || "",
                                          amount: expense.amount,
                                          description: expense.description,
                                          merchant: expense.merchant,
                                          paymentMethod: expense.paymentMethod,
                                          expenseDate: expense.expenseDate,
                                          receiptUrl: expense.receiptUrl,
                                          receiptFileName: expense.receiptFileName,
                                        });
                                        setIsCreateOpen(true);
                                      }
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {pagination.total > 0 && totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t">
                      <span className="text-sm text-muted-foreground">
                        Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of <strong>{pagination.total}</strong> claims
                      </span>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs"
                          disabled={pagination.page <= 1} onClick={() => setFilter("page", pagination.page - 1)}>
                          Previous
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          Page {pagination.page} of {totalPages}
                        </span>
                        <Button variant="outline" size="sm" className="h-8 text-xs"
                          disabled={pagination.page >= totalPages} onClick={() => setFilter("page", pagination.page + 1)}>
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <CreateExpenseDialog
        open={isCreateOpen} onOpenChange={setIsCreateOpen}
        onSuccess={() => { loadData(); setIsCreateOpen(false); }}
        categories={EXPENSE_CATEGORIES} paymentMethods={PAYMENT_METHODS}
      />
    </div>
  );
}
