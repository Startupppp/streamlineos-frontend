"use client";

import { useState, useMemo } from "react";
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
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
  Eye,
  Calculator,
} from "lucide-react";

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const date = subMonths(new Date(), i);
  return {
    value: format(date, "yyyy-MM"),
    label: format(date, "MMMM yyyy"),
  };
});

import { getColorSafe, payrollStatusColors } from "@/lib/theme-constants";

export default function PayrollPage() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const [lopDays, setLopDays] = useState<string>("");
  const [halfDays, setHalfDays] = useState<string>("");
  const [otherDeductions, setOtherDeductions] = useState<string>("");
  const [bonus, setBonus] = useState<string>("");
  const [overtimeType, setOvertimeType] = useState<string>("");
  const [overtimeDays, setOvertimeDays] = useState<string>("");
  const [overtimeHours, setOvertimeHours] = useState<string>("");
  const [overtimeAmount, setOvertimeAmount] = useState<string>("");

  const { data: allPayrolls, isLoading, refetch } = api.hr.getAllPayrolls.useQuery({
    month: selectedMonth,
  });
  const { data: employees } = api.hr.getEmployees.useQuery();

  const selectedEmployeeData = useMemo(() => {
    if (!selectedEmployee || !employees) return null;
    return employees.find(e => e.id === selectedEmployee);
  }, [selectedEmployee, employees]);
  const payslipPreview = useMemo(() => {
    if (!selectedEmployeeData) return null;
    
    const monthlySalary = parseFloat(selectedEmployeeData.monthlySalary || "0");
    const workingDays = 30;
    const perDaySalary = monthlySalary / workingDays;
    const lopDeduction = (parseFloat(lopDays) || 0) * perDaySalary;
    const halfDayDeduction = ((parseFloat(halfDays) || 0) * perDaySalary) / 2;
    const basicPay = monthlySalary * 0.5;
    const hra = monthlySalary * 0.5;
    const professionalTax = 200;
    
    const otAmt = parseFloat(overtimeAmount) || 0;
    const grossSalary = monthlySalary + (parseFloat(bonus) || 0) + otAmt;
    const totalDeductions = lopDeduction + halfDayDeduction + professionalTax + (parseFloat(otherDeductions) || 0);
    const netSalary = grossSalary - totalDeductions;

    return {
      basicPay,
      hra,
      grossSalary,
      lopDeduction,
      halfDayDeduction,
      professionalTax,
      otherDeductions: parseFloat(otherDeductions) || 0,
      bonus: parseFloat(bonus) || 0,
      overtimeAmount: otAmt,
      overtimeType,
      overtimeDays: parseFloat(overtimeDays) || 0,
      overtimeHours: parseFloat(overtimeHours) || 0,
      totalDeductions,
      netSalary,
      lopDays: parseFloat(lopDays) || 0,
      halfDays: parseFloat(halfDays) || 0,
      workingDays,
      effectiveDays: workingDays - (parseFloat(lopDays) || 0) - ((parseFloat(halfDays) || 0) * 0.5),
    };
  }, [selectedEmployeeData, lopDays, halfDays, otherDeductions, bonus, overtimeType, overtimeDays, overtimeHours, overtimeAmount]);

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
      resetDialog();
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

  const resetDialog = () => {
    setGenerateDialogOpen(false);
    setSelectedEmployee("");
    setShowPreview(false);
    setLopDays("");
    setHalfDays("");
    setOtherDeductions("");
    setBonus("");
    setOvertimeType("");
    setOvertimeDays("");
    setOvertimeHours("");
    setOvertimeAmount("");
  };

  const handleGenerateAll = () => {
    generatePayrollMutation.mutate({ month: selectedMonth });
  };

  const handleShowPreview = () => {
    if (!selectedEmployee) {
      toast.error("Please select an employee");
      return;
    }
    setShowPreview(true);
  };

  const handleGenerateForEmployee = () => {
    if (!selectedEmployee) return;
    generateEmployeePayslipMutation.mutate({
      userId: selectedEmployee,
      month: selectedMonth,
      lopDays: parseFloat(lopDays) || 0,
      halfDays: parseFloat(halfDays) || 0,
      otherDeductions: parseFloat(otherDeductions) || 0,
      bonus: parseFloat(bonus) || 0,
      overtimeType: overtimeType === "days" || overtimeType === "hours" ? overtimeType : undefined,
      overtimeDays: parseFloat(overtimeDays) || 0,
      overtimeHours: parseFloat(overtimeHours) || 0,
      overtimeAmount: parseFloat(overtimeAmount) || 0,
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

            <Dialog open={generateDialogOpen} onOpenChange={(open) => {
              if (!open) resetDialog();
              else setGenerateDialogOpen(true);
            }}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Individual
        </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {showPreview ? "Payslip Preview" : "Generate Payslip for Employee"}
                  </DialogTitle>
                </DialogHeader>
                
                <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
                  {showPreview ? `Payslip preview for ${selectedEmployeeData?.firstName ?? "employee"}` : ""}
                </div>
                {!showPreview ? (
                  <div className="space-y-6 pt-4">
                    
                    <div className="space-y-2">
                      <Label>Select Employee</Label>
                      <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                        {employees?.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName} - ₹{parseFloat(emp.monthlySalary || "0").toLocaleString()}/month
                          </SelectItem>
                        ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedEmployeeData && (
                      <>
                        <Separator />
                        
                        
                        <div className="space-y-4">
                          <h4 className="font-medium text-sm text-muted-foreground">Attendance Adjustments</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="lopDays">LOP Days (Loss of Pay)</Label>
                              <Input
                                id="lopDays"
                                type="number"
                                min="0"
                                max="30"
                                value={lopDays}
                                onChange={(e) => setLopDays(e.target.value)}
                                placeholder="0"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="halfDays">Half Days</Label>
                              <Input
                                id="halfDays"
                                type="number"
                                min="0"
                                max="30"
                                value={halfDays}
                                onChange={(e) => setHalfDays(e.target.value)}
                                placeholder="0"
                              />
                            </div>
                          </div>
      </div>

                        <Separator />

                        
                        <div className="space-y-4">
                          <h4 className="font-medium text-sm text-muted-foreground">Additional Adjustments</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="bonus">Bonus / Incentive (₹)</Label>
                              <Input
                                id="bonus"
                                type="number"
                                min="0"
                                value={bonus}
                                onChange={(e) => setBonus(e.target.value)}
                                placeholder="0"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="otherDeductions">Other Deductions (₹)</Label>
                              <Input
                                id="otherDeductions"
                                type="number"
                                min="0"
                                value={otherDeductions}
                                onChange={(e) => setOtherDeductions(e.target.value)}
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>

                        <Separator />

                        
                        <div className="space-y-4">
                          <h4 className="font-medium text-sm text-muted-foreground">Overtime</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label id="overtime-type-label">Overtime Type</Label>
                              <Select value={overtimeType} onValueChange={setOvertimeType}>
                                <SelectTrigger aria-labelledby="overtime-type-label">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="days">Days</SelectItem>
                                  <SelectItem value="hours">Hours</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {overtimeType === "days" && (
                              <div className="space-y-2">
                                <Label htmlFor="overtimeDays">Overtime Days</Label>
                                <Input
                                  id="overtimeDays"
                                  type="number"
                                  min="0"
                                  value={overtimeDays}
                                  onChange={(e) => setOvertimeDays(e.target.value)}
                                  placeholder="0"
                                />
                              </div>
                            )}
                            {overtimeType === "hours" && (
                              <div className="space-y-2">
                                <Label htmlFor="overtimeHours">Overtime Hours</Label>
                                <Input
                                  id="overtimeHours"
                                  type="number"
                                  min="0"
                                  value={overtimeHours}
                                  onChange={(e) => setOvertimeHours(e.target.value)}
                                  placeholder="0"
                                />
                              </div>
                            )}
                          </div>
                          {overtimeType && (
                            <div className="space-y-2">
                              <Label htmlFor="overtimeAmount">Overtime Amount (₹)</Label>
                              <Input
                                id="overtimeAmount"
                                type="number"
                                min="0"
                                value={overtimeAmount}
                                onChange={(e) => setOvertimeAmount(e.target.value)}
                                placeholder="0"
                              />
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleShowPreview} disabled={!selectedEmployee}>
                        <Eye className="mr-2 h-4 w-4" />
                        Preview Payslip
                      </Button>
                    </DialogFooter>
                  </div>
                ) : (
                  <div className="space-y-6 pt-4">
                    
                    <Card className="border-2">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">
                              {selectedEmployeeData?.firstName} {selectedEmployeeData?.lastName}
              </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {selectedEmployeeData?.designation || "Employee"}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}
                          </Badge>
                        </div>
            </CardHeader>
                      <CardContent className="space-y-4">
                        
                <div>
                          <h4 className="font-semibold text-sm mb-2 text-green-700">Earnings</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Basic Pay</span>
                              <span>₹{payslipPreview?.basicPay.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">HRA</span>
                              <span>₹{payslipPreview?.hra.toLocaleString()}</span>
                            </div>
                            {(payslipPreview?.bonus || 0) > 0 && (
                              <div className="flex justify-between text-green-600">
                                <span>Bonus / Incentive</span>
                                <span>+₹{payslipPreview?.bonus.toLocaleString()}</span>
                              </div>
                            )}
                            {(payslipPreview?.overtimeAmount || 0) > 0 && (
                              <div className="flex justify-between text-green-600">
                                <span>
                                  Overtime Pay
                                  {payslipPreview?.overtimeType === "days"
                                    ? ` (${payslipPreview.overtimeDays} days)`
                                    : payslipPreview?.overtimeType === "hours"
                                    ? ` (${payslipPreview.overtimeHours} hrs)`
                                    : ""}
                                </span>
                                <span>+₹{payslipPreview?.overtimeAmount.toLocaleString()}</span>
                              </div>
                            )}
                            <Separator className="my-2" />
                            <div className="flex justify-between font-medium">
                              <span>Gross Salary</span>
                              <span>₹{payslipPreview?.grossSalary.toLocaleString()}</span>
                            </div>
                          </div>
                </div>

                        
                <div>
                          <h4 className="font-semibold text-sm mb-2 text-red-700">Deductions</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Professional Tax</span>
                              <span className="text-red-600">-₹{payslipPreview?.professionalTax.toLocaleString()}</span>
                            </div>
                            {(payslipPreview?.lopDays || 0) > 0 && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  LOP Deduction ({payslipPreview?.lopDays} days)
                                </span>
                                <span className="text-red-600">-₹{Math.round(payslipPreview?.lopDeduction || 0).toLocaleString()}</span>
                              </div>
                            )}
                            {(payslipPreview?.halfDays || 0) > 0 && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Half Day Deduction ({payslipPreview?.halfDays} days)
                                </span>
                                <span className="text-red-600">-₹{Math.round(payslipPreview?.halfDayDeduction || 0).toLocaleString()}</span>
                              </div>
                            )}
                            {(payslipPreview?.otherDeductions || 0) > 0 && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Other Deductions</span>
                                <span className="text-red-600">-₹{payslipPreview?.otherDeductions.toLocaleString()}</span>
                              </div>
                            )}
                            <Separator className="my-2" />
                            <div className="flex justify-between font-medium">
                              <span>Total Deductions</span>
                              <span className="text-red-600">-₹{Math.round(payslipPreview?.totalDeductions || 0).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        
                        <div className="flex justify-between items-center pt-2">
                          <span className="text-lg font-bold">Net Salary</span>
                          <span className="text-2xl font-bold text-green-600">
                            ₹{Math.round(payslipPreview?.netSalary || 0).toLocaleString()}
                          </span>
                        </div>

                        
                        <div className="bg-muted/50 rounded-lg p-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Working Days</span>
                            <span>{payslipPreview?.workingDays}</span>
                </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Effective Days</span>
                            <span>{payslipPreview?.effectiveDays}</span>
                </div>
              </div>
            </CardContent>
          </Card>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowPreview(false)}>
                        <Calculator className="mr-2 h-4 w-4" />
                        Edit Details
                      </Button>
                      <Button
                        onClick={handleGenerateForEmployee}
                        disabled={generateEmployeePayslipMutation.isPending}
                      >
                        {generateEmployeePayslipMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-2 h-4 w-4" />
                        )}
                        Confirm & Generate
                      </Button>
                    </DialogFooter>
                  </div>
                )}
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
            <p className="text-xs text-muted-foreground mt-1">With payroll records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gross</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalGross.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Before deductions</p>
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
            <p className="text-xs text-muted-foreground mt-1">After all deductions</p>
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
        <CardContent aria-live="polite">
          {allPayrolls && allPayrolls.length > 0 ? (
            <Table>
              <caption className="sr-only">Payroll records for selected month</caption>
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
                      <Badge variant="outline" className={getColorSafe(payrollStatusColors, payroll.status ?? "DRAFT")}>
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
