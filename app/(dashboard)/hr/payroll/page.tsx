"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { format, subMonths } from "date-fns";
import { toast } from "sonner";
import { PayrollListSkeleton } from "@/components/ui/payroll-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  FileText,
  Users,
  Check,
  Loader2,
  Download,
  CreditCard,
} from "lucide-react";

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const date = subMonths(new Date(), i);
  return {
    value: format(date, "yyyy-MM"),
    label: format(date, "MMMM yyyy"),
  };
});

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500/10 text-gray-700 border-gray-200",
  PENDING_APPROVAL: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  APPROVED: "bg-blue-500/10 text-blue-700 border-blue-200",
  PAID: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
};

export default function PayrollPage() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");

  const { data: allPayrolls, isLoading, refetch } = api.hr.getAllPayrolls.useQuery({
    month: selectedMonth,
  });
  const { data: employees } = api.hr.getEmployees.useQuery();

  const generatePayrollMutation = api.hr.generatePayroll.useMutation({
    onSuccess: () => {
      toast.success("Payroll generated for all employees");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const generateEmployeePayslipMutation = api.hr.generateEmployeePayslip.useMutation({
    onSuccess: () => {
      toast.success("Payslip generated successfully");
      setGenerateDialogOpen(false);
      setSelectedEmployee("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const approvePayrollMutation = api.hr.approvePayroll.useMutation({
    onSuccess: () => {
      toast.success("Payroll approved");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const markPaidMutation = api.hr.markPayrollPaid.useMutation({
    onSuccess: () => {
      toast.success("Payroll marked as paid");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleGenerateAll = () => {
    generatePayrollMutation.mutate({ month: selectedMonth });
  };

  const handleGenerateForEmployee = () => {
    if (!selectedEmployee) return;
    generateEmployeePayslipMutation.mutate({
      userId: selectedEmployee,
      month: selectedMonth,
    });
  };

  const totalGross = allPayrolls?.reduce(
    (sum, p) => sum + parseFloat(p.grossSalary || "0"),
    0
  ) || 0;
  const totalNet = allPayrolls?.reduce(
    (sum, p) => sum + parseFloat(p.netSalary || "0"),
    0
  ) || 0;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-10 w-56" />
        </div>
        <PayrollListSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll Management"
        description="Generate and manage employee payrolls"
        actions={
          <div className="flex gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Individual
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate Payslip for Employee</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleGenerateForEmployee}
                    disabled={!selectedEmployee || generateEmployeePayslipMutation.isPending}
                    className="w-full"
                  >
                    {generateEmployeePayslipMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Generate Payslip for {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button onClick={handleGenerateAll} disabled={generatePayrollMutation.isPending}>
              {generatePayrollMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Users className="mr-2 h-4 w-4" />
              )}
              Generate All
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allPayrolls?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gross</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalGross.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Net Payout</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{totalNet.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll for {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}</CardTitle>
          <CardDescription>
            Manage payroll status and generate payslips
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allPayrolls && allPayrolls.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Gross Salary</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allPayrolls.map((payroll) => (
                  <TableRow key={payroll.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {payroll.user?.firstName} {payroll.user?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {payroll.user?.designation}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>₹{parseFloat(payroll.grossSalary || "0").toLocaleString()}</TableCell>
                    <TableCell className="text-red-600">
                      -₹{parseFloat(payroll.deductions || "0").toLocaleString()}
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      ₹{parseFloat(payroll.netSalary || "0").toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[payroll.status || "DRAFT"]}>
                        {payroll.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {payroll.status === "DRAFT" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => approvePayrollMutation.mutate({ payrollId: payroll.id })}
                            disabled={approvePayrollMutation.isPending}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                        )}
                        {payroll.status === "APPROVED" && (
                          <Button
                            size="sm"
                            onClick={() => markPaidMutation.mutate({ payrollId: payroll.id })}
                            disabled={markPaidMutation.isPending}
                          >
                            <CreditCard className="h-3 w-3 mr-1" />
                            Mark Paid
                          </Button>
                        )}
                        {payroll.status === "PAID" && (
                          <Button size="sm" variant="ghost">
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payroll records for this month</p>
              <p className="text-sm">Click &quot;Generate All&quot; to create payroll for all employees</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
