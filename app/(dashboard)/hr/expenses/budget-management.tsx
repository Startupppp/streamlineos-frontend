"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Plus,
  Settings,
  Trash2,
  Edit2,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  PieChart,
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
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  getExpenseCategories,
  createExpenseCategory,
  getCategorySpending,
} from "@/server/actions/expense-actions";

interface CategorySpending {
  categoryId: number;
  categoryName: string;
  budgetLimit: number;
  budgetPeriod: string;
  totalSpent: number;
  pendingAmount: number;
  approvedAmount: number;
}

interface BudgetManagementProps {
  onClose?: () => void;
}

export function BudgetManagement({ onClose }: BudgetManagementProps) {
  const [categories, setCategories] = useState<Awaited<ReturnType<typeof getExpenseCategories>>>([]);
  const [spending, setSpending] = useState<CategorySpending[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    budgetLimit: "",
    budgetPeriod: "MONTHLY",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [catData, spendingData] = await Promise.all([
        getExpenseCategories(),
        getCategorySpending(),
      ]);
      setCategories(catData);
      setSpending(spendingData || []);
    } catch (error) {
      toast.error("Failed to load budget data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name) {
      toast.error("Category name is required");
      return;
    }

    const result = await createExpenseCategory({
      name: newCategory.name,
      description: newCategory.description,
      budgetLimit: newCategory.budgetLimit ? parseFloat(newCategory.budgetLimit) : undefined,
      budgetPeriod: newCategory.budgetPeriod,
    });

    if (result.success) {
      toast.success("Category created successfully");
      setIsCreateOpen(false);
      setNewCategory({ name: "", description: "", budgetLimit: "", budgetPeriod: "MONTHLY" });
      loadData();
    } else {
      toast.error(result.error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getUsagePercentage = (spent: number, limit: number) => {
    if (!limit) return 0;
    return Math.min((spent / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const totalBudget = spending.reduce((sum, s) => sum + (s.budgetLimit || 0), 0);
  const totalSpent = spending.reduce((sum, s) => sum + s.totalSpent, 0);
  const totalPending = spending.reduce((sum, s) => sum + s.pendingAmount, 0);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded" />
        <div className="h-64 bg-slate-200 animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Budget Management</h2>
          <p className="text-slate-600 mt-1">Manage expense categories and budget limits</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-violet-600 hover:bg-violet-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
            <p className="text-xs text-slate-500 mt-1">This month&apos;s allocation</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
            <p className="text-xs text-slate-500 mt-1">
              {totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(1)}% of budget` : "No budget set"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Pending Claims</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPending)}</div>
            <p className="text-xs text-slate-500 mt-1">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Budget Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-violet-600" />
            Category Budgets
          </CardTitle>
          <CardDescription>Monitor spending against budget limits by category</CardDescription>
        </CardHeader>
        <CardContent>
          {spending.length === 0 ? (
            <div className="text-center py-8">
              <div className="flex flex-col items-center gap-3">
                <EmptyExpensesIllustration />
                <h3 className="text-lg font-medium text-slate-900">No categories yet</h3>
                <p className="text-slate-500 mb-4">Create expense categories to track budgets</p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Category
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Budget Period</TableHead>
                  <TableHead className="text-right">Budget Limit</TableHead>
                  <TableHead className="text-right">Spent</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {spending.map((item) => {
                  const percentage = getUsagePercentage(item.totalSpent, item.budgetLimit);
                  return (
                    <TableRow key={item.categoryId}>
                      <TableCell className="font-medium">{item.categoryName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {item.budgetPeriod?.toLowerCase() || "Monthly"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.budgetLimit ? formatCurrency(item.budgetLimit) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.totalSpent)}
                      </TableCell>
                      <TableCell className="text-right text-amber-600">
                        {formatCurrency(item.pendingAmount)}
                      </TableCell>
                      <TableCell className="w-[150px]">
                        {item.budgetLimit ? (
                          <div className="space-y-1">
                            <Progress 
                              value={percentage} 
                              className={`h-2 ${getUsageColor(percentage)}`}
                            />
                            <span className="text-xs text-slate-500">{percentage.toFixed(0)}%</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No limit</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {percentage >= 90 ? (
                          <Badge className="bg-red-100 text-red-800 border-red-200">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Over Budget
                          </Badge>
                        ) : percentage >= 75 ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                            Warning
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                            On Track
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Category Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Expense Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="e.g., Travel, Marketing"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                placeholder="Brief description of this category..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budgetLimit">Budget Limit (₹)</Label>
                <Input
                  id="budgetLimit"
                  type="number"
                  value={newCategory.budgetLimit}
                  onChange={(e) => setNewCategory({ ...newCategory, budgetLimit: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budgetPeriod">Budget Period</Label>
                <Select
                  value={newCategory.budgetPeriod}
                  onValueChange={(value) => setNewCategory({ ...newCategory, budgetPeriod: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCategory} className="bg-violet-600 hover:bg-violet-700">
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

