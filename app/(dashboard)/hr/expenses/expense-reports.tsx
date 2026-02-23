"use client";

import { useState, useEffect, useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth, subDays } from "date-fns";
import {
  Download,
  FileText,
  TrendingUp,
  Calendar,
  Users,
  PieChart,
  BarChart3,
} from "lucide-react";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getExpenseReportData } from "@/server/actions/expense-actions";

interface ExpenseReportsProps {
  isAdmin: boolean;
}

interface ReportData {
  summary: {
    totalExpenses: number;
    totalAmount: number;
    approvedAmount: number;
    rejectedAmount: number;
    pendingAmount: number;
    avgExpenseAmount: number;
  };
  byCategory: {
    category: string;
    count: number;
    amount: number;
    percentage: number;
  }[];
  byEmployee: {
    userId: string;
    userName: string;
    count: number;
    amount: number;
  }[];
  byMonth: {
    month: string;
    count: number;
    amount: number;
  }[];
  topExpenses: {
    id: number;
    category: string;
    amount: number;
    description: string;
    userName: string;
    expenseDate: string;
  }[];
}

export function ExpenseReports({ isAdmin }: ExpenseReportsProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("this_month");

  useEffect(() => {
    loadReportData();
  }, [period]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      let startDate: Date;
      let endDate: Date = new Date();

      switch (period) {
        case "this_month":
          startDate = startOfMonth(new Date());
          endDate = endOfMonth(new Date());
          break;
        case "last_month":
          startDate = startOfMonth(subMonths(new Date(), 1));
          endDate = endOfMonth(subMonths(new Date(), 1));
          break;
        case "last_3_months":
          startDate = startOfMonth(subMonths(new Date(), 3));
          break;
        case "last_6_months":
          startDate = startOfMonth(subMonths(new Date(), 6));
          break;
        case "this_year":
          startDate = new Date(new Date().getFullYear(), 0, 1);
          break;
        default:
          startDate = startOfMonth(new Date());
      }

      const data = await getExpenseReportData({
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
      });
      setReportData(data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const exportToCSV = () => {
    if (!reportData) return;

    const headers = ["Category", "Employee", "Amount", "Description", "Date", "Status"];
    const rows = reportData.topExpenses.map((exp) => [
      exp.category,
      exp.userName,
      exp.amount,
      exp.description,
      exp.expenseDate,
      "Approved",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expense-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-12">
        <div className="flex flex-col items-center gap-3">
          <EmptyExpensesIllustration />
          <h3 className="text-lg font-medium">No data available</h3>
          <p className="text-muted-foreground">Try selecting a different time period</p>
        </div>
      </div>
    );
  }

  const { summary, byCategory, byEmployee, byMonth, topExpenses } = reportData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Expense Reports</h2>
          <p className="text-muted-foreground mt-1">Analyze expense trends and patterns</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_3_months">Last 3 Months</SelectItem>
              <SelectItem value="last_6_months">Last 6 Months</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">{summary.totalExpenses} claims</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.approvedAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.totalAmount > 0
                ? `${((summary.approvedAmount / summary.totalAmount) * 100).toFixed(0)}% of total`
                : "0%"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.pendingAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.avgExpenseAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">Per claim</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* By Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              By Category
            </CardTitle>
            <CardDescription>Expense distribution by category</CardDescription>
          </CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <EmptyExpensesIllustration />
                <p className="text-center text-muted-foreground">No data available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {byCategory.slice(0, 6).map((cat) => (
                  <div key={cat.category} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{cat.category}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(cat.amount)} ({cat.percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Month */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Monthly Trend
            </CardTitle>
            <CardDescription>Expense trend over time</CardDescription>
          </CardHeader>
          <CardContent>
            {byMonth.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <EmptyExpensesIllustration />
                <p className="text-center text-muted-foreground">No data available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {byMonth.map((month) => {
                  const maxAmount = Math.max(...byMonth.map((m) => m.amount));
                  const percentage = maxAmount > 0 ? (month.amount / maxAmount) * 100 : 0;
                  return (
                    <div key={month.month} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{month.month}</span>
                        <span className="text-muted-foreground">
                          {formatCurrency(month.amount)} ({month.count} claims)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Top Expenses
          </CardTitle>
          <CardDescription>Highest expense claims in selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {topExpenses.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <EmptyExpensesIllustration />
              <p className="text-center text-muted-foreground">No expenses in this period</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isAdmin && <TableHead>Employee</TableHead>}
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topExpenses.slice(0, 10).map((expense) => (
                  <TableRow key={expense.id}>
                    {isAdmin && (
                      <TableCell className="font-medium">{expense.userName}</TableCell>
                    )}
                    <TableCell>
                      <Badge variant="outline">{expense.category}</Badge>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* By Employee (Admin only) */}
      {isAdmin && byEmployee.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              By Employee
            </CardTitle>
            <CardDescription>Expense breakdown by team member</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-center">Claims</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Average</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byEmployee.slice(0, 10).map((emp) => (
                  <TableRow key={emp.userId}>
                    <TableCell className="font-medium">{emp.userName}</TableCell>
                    <TableCell className="text-center">{emp.count}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(emp.amount)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(emp.count > 0 ? emp.amount / emp.count : 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

