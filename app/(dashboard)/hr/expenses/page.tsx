"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { format } from "date-fns";
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
  Wallet,
  TrendingUp,
  Settings,
  BarChart3,
  Download,
  RefreshCw,
  FileImage,
} from "lucide-react";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const EXPENSE_CATEGORIES = [
  "Travel",
  "Meals",
  "Office Supplies",
  "Software",
  "Equipment",
  "Training",
  "Marketing",
  "Utilities",
  "Other",
];

const PAYMENT_METHODS = [
  "Cash",
  "Company Card",
  "Personal Card",
  "Bank Transfer",
  "UPI",
  "Online",
  "Offline",
  "Cheque",
  "NEFT",
  "IMPS",
  "Debit Card",
  "Credit Card",
  "Wallet",
  "Demand Draft",
  "Other",
];

export default function ExpensesPage() {
  const { data: session } = useSession();
  const [pageData, setPageData] = useState<ExpensePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseWithRelations | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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

  const expenseStatusIcons: Record<string, React.ReactNode> = {
    PENDING: <Clock className="h-3 w-3 mr-1" aria-hidden="true" />,
    APPROVED: <CheckCircle2 className="h-3 w-3 mr-1" aria-hidden="true" />,
    REJECTED: <XCircle className="h-3 w-3 mr-1" aria-hidden="true" />,
    PAID: <DollarSign className="h-3 w-3 mr-1" aria-hidden="true" />,
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge
        className={`${getColorSafe(expenseStatusColors, status)} flex items-center font-medium`}
      >
        {expenseStatusIcons[status]}
        {status}
      </Badge>
    );
  };
  const formatCurrency = formatINR;

  if (loading && !pageData) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
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

  return (
    <div className="flex-1 space-y-6">
      <PageHeader
        title="Expense Management"
        description={isAdmin
          ? "Manage and approve expense claims across the organization"
          : "Submit and track your expense reimbursements"}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            <ExpenseExportDialog filters={filters} />
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Expense
            </Button>
          </div>
        }
      />

      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.totalAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalCount || 0} claims submitted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.pendingAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.pendingCount || 0} awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency((stats?.approvedAmount || 0) + (stats?.paidAmount || 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ready for reimbursement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Claim</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.avgExpenseAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Per expense claim</p>
          </CardContent>
        </Card>
      </div>

      
      <Tabs
        defaultValue={isAdmin && pendingExpenses.length > 0 ? "pending" : "all"}
        className="space-y-4"
      >
        <TabsList>
          {isAdmin && (
            <TabsTrigger value="pending">
              Pending ({pendingExpenses.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="all">
            {isAdmin ? "All Expenses" : "My Expenses"}
          </TabsTrigger>
          <TabsTrigger value="reports">
            <BarChart3 className="h-4 w-4 mr-1.5" />
            Reports
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="budgets">
              <Settings className="h-4 w-4 mr-1.5" />
              Budgets
            </TabsTrigger>
          )}
        </TabsList>

        
        {isAdmin && (
          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  Pending Approval
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0" aria-live="polite">
                {pendingExpenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <EmptyExpensesIllustration className="mb-3" />
                    <h3 className="text-lg font-medium">All caught up!</h3>
                    <p className="text-muted-foreground">
                      No pending expense claims to review
                    </p>
                  </div>
                ) : (
                  <Table>
                    <caption className="sr-only">Pending expense claims awaiting approval</caption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Receipt</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={resolveImageUrl(expense.user?.image)} />
                                <AvatarFallback className="text-xs">
                                  {expense.user?.firstName?.[0]}
                                  {expense.user?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {expense.user?.firstName} {expense.user?.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {expense.user?.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-normal">
                              {expense.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {expense.description || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(expense.expenseDate), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell>
                            {expense.receiptUrl ? (
                              <ReceiptViewer
                                receiptUrl={expense.receiptUrl}
                                fileName={expense.receiptFileName || undefined}
                                expenseId={expense.id}
                              />
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                No receipt
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" onClick={() => handleApprove(expense.id)}>
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
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
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        
        <TabsContent value="all" className="space-y-4">
          
          <ExpenseFilterBar
            filters={filters}
            categories={categories}
            onFilterChange={setFilter}
            onFiltersChange={setFilters}
            onReset={resetFilters}
            datePreset={datePreset}
            onDatePresetChange={setDatePreset}
            onCustomDateRange={setCustomDateRange}
            activeFilterCount={activeFilterCount}
            isAdmin={isAdmin}
          />

          
          <Card>
            <CardContent className="p-0" aria-live="polite">
              {expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <EmptyExpensesIllustration className="mb-3" />
                  <h3 className="text-lg font-medium">No expenses found</h3>
                  <p className="text-muted-foreground mb-4">
                    {activeFilterCount > 0
                      ? "Try adjusting your filters"
                      : "Submit your first expense claim to get started"}
                  </p>
                  {activeFilterCount > 0 ? (
                    <Button variant="outline" onClick={resetFilters}>
                      Clear Filters
                    </Button>
                  ) : (
                    <Button onClick={() => setIsCreateOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      New Expense
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <Table>
                    <caption className="sr-only">All expense claims</caption>
                    <TableHeader>
                      <TableRow>
                        {isAdmin && <TableHead>Employee</TableHead>}
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Merchant</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Receipt</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          {isAdmin && (
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={resolveImageUrl(expense.user?.image)} />
                                  <AvatarFallback className="text-xs">
                                    {expense.user?.firstName?.[0]}
                                    {expense.user?.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">
                                  {expense.user?.firstName} {expense.user?.lastName}
                                </span>
                              </div>
                            </TableCell>
                          )}
                          <TableCell>
                            <Badge variant="outline" className="font-normal">
                              {expense.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground">
                            {expense.description || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {expense.merchant || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(expense.expenseDate), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell>
                            {expense.receiptUrl ? (
                              <ReceiptViewer
                                receiptUrl={expense.receiptUrl}
                                fileName={expense.receiptFileName || undefined}
                                expenseId={expense.id}
                                trigger={
                                  <div className="flex items-center gap-1.5 text-sm text-primary hover:underline cursor-pointer">
                                    <FileImage className="h-4 w-4" />
                                    View
                                  </div>
                                }
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(expense.status || "PENDING")}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
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
                                {isAdmin && expense.status === "APPROVED" && (
                                  <DropdownMenuItem
                                    onClick={() => handleMarkPaid(expense.id)}
                                  >
                                    <DollarSign className="mr-2 h-4 w-4" />
                                    Mark as Paid
                                  </DropdownMenuItem>
                                )}
                                {(expense.status === "PENDING" || isAdmin) && (
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
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  
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

        
        <TabsContent value="reports" className="space-y-4">
          <ExpenseReports isAdmin={isAdmin} />
        </TabsContent>

        
        {isAdmin && (
          <TabsContent value="budgets" className="space-y-4">
            <BudgetManagement />
          </TabsContent>
        )}
      </Tabs>

      
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
