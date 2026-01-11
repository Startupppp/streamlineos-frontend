"use client";

import { useState, useEffect, useMemo } from "react";
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
  Search,
  Wallet,
  TrendingUp,
  Settings,
  BarChart3,
  Download,
} from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  getExpenses,
  getMyExpenses,
  getPendingExpenses,
  approveExpense,
  rejectExpense,
  markExpenseAsPaid,
  deleteExpense,
  getExpenseStats,
  getExpenseCategories,
} from "@/server/actions/expense-actions";
import { CreateExpenseDialog } from "./create-expense-dialog";
import { BudgetManagement } from "./budget-management";
import { ExpenseReports } from "./expense-reports";
import { useSession } from "next-auth/react";

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
  "Other",
];

type Expense = Awaited<ReturnType<typeof getExpenses>>[number];

export default function ExpensesPage() {
  const { data: session } = useSession();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getExpenseStats>>>(null);
  const [categories, setCategories] = useState<Awaited<ReturnType<typeof getExpenseCategories>>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const isAdmin = session?.user?.role === "OWNER" || session?.user?.role === "ADMIN";

  useEffect(() => {
    loadData();
  }, [selectedStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [expData, pendingData, statsData, catData] = await Promise.all([
        isAdmin ? getExpenses({ status: selectedStatus }) : getMyExpenses(),
        isAdmin ? getPendingExpenses() : Promise.resolve([]),
        getExpenseStats(),
        getExpenseCategories(),
      ]);
      setExpenses(expData);
      setPendingExpenses(pendingData);
      setStats(statsData);
      setCategories(catData);
    } catch (error) {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const matchesSearch =
        searchTerm === "" ||
        expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.merchant?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [expenses, searchTerm]);

  const handleApprove = async (expenseId: number) => {
    const result = await approveExpense(expenseId);
    if (result.success) {
      toast.success("Expense approved");
      loadData();
    } else {
      toast.error(result.error);
    }
  };

  const handleReject = async () => {
    if (!selectedExpense || !rejectionReason) return;
    const result = await rejectExpense(selectedExpense.id, rejectionReason);
    if (result.success) {
      toast.success("Expense rejected");
      setIsRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedExpense(null);
      loadData();
    } else {
      toast.error(result.error);
    }
  };

  const handleMarkPaid = async (expenseId: number) => {
    const result = await markExpenseAsPaid(expenseId);
    if (result.success) {
      toast.success("Expense marked as paid");
      loadData();
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async (expenseId: number) => {
    const result = await deleteExpense(expenseId);
    if (result.success) {
      toast.success("Expense deleted");
      loadData();
    } else {
      toast.error(result.error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: "bg-amber-100 text-amber-800 border-amber-200",
      APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
      REJECTED: "bg-red-100 text-red-800 border-red-200",
      PAID: "bg-blue-100 text-blue-800 border-blue-200",
    };
    const icons = {
      PENDING: <Clock className="h-3 w-3 mr-1" />,
      APPROVED: <CheckCircle2 className="h-3 w-3 mr-1" />,
      REJECTED: <XCircle className="h-3 w-3 mr-1" />,
      PAID: <DollarSign className="h-3 w-3 mr-1" />,
    };
    return (
      <Badge className={`${styles[status as keyof typeof styles]} flex items-center font-medium`}>
        {icons[status as keyof typeof icons]}
        {status}
      </Badge>
    );
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(amount));
  };

  if (loading) {
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

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Expense Management
          </h1>
          <p className="text-slate-600 mt-1">
            {isAdmin
              ? "Manage and approve expense claims across the organization"
              : "Submit and track your expense reimbursements"}
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700">
          <Plus className="mr-2 h-4 w-4" />
          New Expense
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Expenses
            </CardTitle>
            <div className="p-2 bg-violet-100 rounded-lg">
              <Wallet className="h-4 w-4 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(stats?.totalAmount || 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats?.totalCount || 0} claims submitted
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Pending Approval
            </CardTitle>
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(stats?.pendingAmount || 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats?.pendingCount || 0} awaiting review
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Approved
            </CardTitle>
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(stats?.approvedAmount || 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Ready for reimbursement
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Average Claim
            </CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(
                stats?.totalCount
                  ? (stats.totalAmount || 0) / stats.totalCount
                  : 0
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">Per expense claim</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue={isAdmin && pendingExpenses.length > 0 ? "pending" : "all"} className="space-y-4">
        <TabsList className="bg-white shadow-sm border">
          {isAdmin && (
            <TabsTrigger value="pending" className="data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700">
              Pending ({pendingExpenses.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="all" className="data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700">
            {isAdmin ? "All Expenses" : "My Expenses"}
          </TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700">
            <BarChart3 className="h-4 w-4 mr-1.5" />
            Reports
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="budgets" className="data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700">
              <Settings className="h-4 w-4 mr-1.5" />
              Budgets
            </TabsTrigger>
          )}
        </TabsList>

        {/* Pending Tab */}
        {isAdmin && (
          <TabsContent value="pending" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="border-b bg-slate-50/50">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  Pending Approval
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {pendingExpenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="p-4 bg-emerald-100 rounded-full mb-4">
                      <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">All caught up!</h3>
                    <p className="text-slate-500">No pending expense claims to review</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
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
                        <TableRow key={expense.id} className="hover:bg-slate-50/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={expense.user?.image || undefined} />
                                <AvatarFallback className="bg-violet-100 text-violet-700 text-xs">
                                  {expense.user?.firstName?.[0]}
                                  {expense.user?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-slate-900">
                                  {expense.user?.firstName} {expense.user?.lastName}
                                </p>
                                <p className="text-xs text-slate-500">{expense.user?.email}</p>
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
                          <TableCell className="text-slate-600">
                            {format(new Date(expense.expenseDate), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-slate-900">
                            {formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell>
                            {expense.receiptUrl ? (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(expense.receiptUrl!, "_blank")}
                                  className="text-violet-600 hover:text-violet-700"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={async () => {
                                    try {
                                      const response = await fetch(expense.receiptUrl!);
                                      const blob = await response.blob();
                                      const url = window.URL.createObjectURL(blob);
                                      const link = document.createElement("a");
                                      link.href = url;
                                      link.download = expense.receiptFileName || `receipt-${expense.id}`;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                      window.URL.revokeObjectURL(url);
                                      toast.success("Download started");
                                    } catch {
                                      toast.error("Failed to download");
                                    }
                                  }}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-sm">No receipt</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(expense.id)}
                                className="bg-emerald-600 hover:bg-emerald-700"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedExpense(expense);
                                  setIsRejectDialogOpen(true);
                                }}
                                className="border-red-200 text-red-600 hover:bg-red-50"
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

        {/* All Expenses Tab */}
        <TabsContent value="all" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
            {isAdmin && (
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Expenses Table */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {filteredExpenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="p-4 bg-slate-100 rounded-full mb-4">
                    <Receipt className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900">No expenses found</h3>
                  <p className="text-slate-500 mb-4">Submit your first expense claim to get started</p>
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Expense
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      {isAdmin && <TableHead>Employee</TableHead>}
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Merchant</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense.id} className="hover:bg-slate-50/50">
                        {isAdmin && (
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={expense.user?.image || undefined} />
                                <AvatarFallback className="bg-violet-100 text-violet-700 text-xs">
                                  {expense.user?.firstName?.[0]}
                                  {expense.user?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-slate-900">
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
                        <TableCell className="max-w-[200px] truncate text-slate-600">
                          {expense.description || "-"}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {expense.merchant || "-"}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {format(new Date(expense.expenseDate), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-slate-900">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell>{getStatusBadge(expense.status || "PENDING")}</TableCell>
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
                                  <DropdownMenuItem
                                    onClick={() => window.open(expense.receiptUrl!, "_blank")}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Receipt
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      try {
                                        const response = await fetch(expense.receiptUrl!);
                                        const blob = await response.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const link = document.createElement("a");
                                        link.href = url;
                                        link.download = expense.receiptFileName || `receipt-${expense.id}`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        window.URL.revokeObjectURL(url);
                                        toast.success("Download started");
                                      } catch {
                                        toast.error("Failed to download receipt");
                                      }
                                    }}
                                  >
                                    <Download className="mr-2 h-4 w-4" />
                                    Download Receipt
                                  </DropdownMenuItem>
                                </>
                              )}
                              {isAdmin && expense.status === "APPROVED" && (
                                <DropdownMenuItem onClick={() => handleMarkPaid(expense.id)}>
                                  <DollarSign className="mr-2 h-4 w-4" />
                                  Mark as Paid
                                </DropdownMenuItem>
                              )}
                              {(expense.status === "PENDING" || isAdmin) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(expense.id)}
                                    className="text-red-600"
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <ExpenseReports isAdmin={isAdmin} />
        </TabsContent>

        {/* Budgets Tab (Admin Only) */}
        {isAdmin && (
          <TabsContent value="budgets" className="space-y-4">
            <BudgetManagement />
          </TabsContent>
        )}
      </Tabs>

      {/* Create Expense Dialog */}
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

      {/* Rejection Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-600">
              Please provide a reason for rejecting this expense claim.
            </p>
            <Input
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={!rejectionReason}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

