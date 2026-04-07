"use client";
import { getErrorMessage } from "@/lib/get-error-message";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  useHrAllPayrolls,
  useHrEmployees,
  useGeneratePayroll,
  useGenerateEmployeePayslip,
  useApprovePayroll,
  useMarkPayrollPaid,
} from "@/lib/api/hooks/hr";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subMonths } from "date-fns";
import { toast } from "sonner";
import { Users, Loader2, DollarSign, CreditCard, FileText, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { Employee } from "@/types/hr";

import { PayrollTable } from "@/features/hr/payroll/payroll-table";
import { GeneratePayrollSheet } from "@/features/hr/payroll/generate-payroll-sheet";

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const date = subMonths(new Date(), i);
  return {
    value: format(date, "yyyy-MM"),
    label: format(date, "MMMM yyyy"),
  };
});

export default function PayrollPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedMonth = searchParams.get("month") || format(new Date(), "yyyy-MM");
  const setSelectedMonth = useCallback(
    (month: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("month", month);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );
  const [generateSheetOpen, setGenerateSheetOpen] = useState(false);
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

  const { data: allPayrolls, isLoading } = useHrAllPayrolls({ month: selectedMonth });
  const { data: employeesRaw } = useHrEmployees();

  const employees = useMemo(
    () =>
      (Array.isArray(employeesRaw)
        ? employeesRaw
        : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[],
    [employeesRaw]
  );

  const generatePayrollMutation = useGeneratePayroll();
  const generateEmployeePayslipMutation = useGenerateEmployeePayslip();
  const approvePayrollMutation = useApprovePayroll();
  const markPaidMutation = useMarkPayrollPaid();

  const selectedEmployeeData = useMemo(() => {
    if (!selectedEmployee || !employees.length) return null;
    return employees.find((e) => e.id === selectedEmployee) ?? null;
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
    const totalDeductions =
      lopDeduction +
      halfDayDeduction +
      professionalTax +
      (parseFloat(otherDeductions) || 0);
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
      effectiveDays:
        workingDays -
        (parseFloat(lopDays) || 0) -
        (parseFloat(halfDays) || 0) * 0.5,
    };
  }, [
    selectedEmployeeData,
    lopDays,
    halfDays,
    otherDeductions,
    bonus,
    overtimeType,
    overtimeDays,
    overtimeHours,
    overtimeAmount,
  ]);

  const resetSheet = () => {
    setGenerateSheetOpen(false);
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

  const handleGenerateAll = useCallback(() => {
    generatePayrollMutation.mutate(
      { month: selectedMonth },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: queryKeys.hr.payrolls({ month: selectedMonth }) });
          toast.success("Payroll generated for all employees");
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      }
    );
  }, [generatePayrollMutation, selectedMonth, qc]);

  const handleShowPreview = useCallback(() => {
    if (!selectedEmployee) {
      toast.error("Please select an employee");
      return;
    }
    setShowPreview(true);
  }, [selectedEmployee]);

  const handleGenerateForEmployee = useCallback(() => {
    if (!selectedEmployee) return;
    generateEmployeePayslipMutation.mutate(
      {
        userId: selectedEmployee,
        month: selectedMonth,
        lopDays: parseFloat(lopDays) || 0,
        halfDays: parseFloat(halfDays) || 0,
        otherDeductions: parseFloat(otherDeductions) || 0,
        bonus: parseFloat(bonus) || 0,
        overtimeType:
          overtimeType === "days" || overtimeType === "hours"
            ? overtimeType
            : undefined,
        overtimeDays: parseFloat(overtimeDays) || 0,
        overtimeHours: parseFloat(overtimeHours) || 0,
        overtimeAmount: parseFloat(overtimeAmount) || 0,
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: queryKeys.hr.payrolls({ month: selectedMonth }) });
          toast.success("Payslip generated successfully");
          resetSheet();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      }
    );
  }, [selectedEmployee, generateEmployeePayslipMutation, selectedMonth, lopDays, halfDays, otherDeductions, bonus, overtimeType, overtimeDays, overtimeHours, overtimeAmount, qc]);

  const handleApprovePayroll = useCallback((payrollId: number) => {
    approvePayrollMutation.mutate(
      { payrollId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: queryKeys.hr.payrolls({ month: selectedMonth }) });
          toast.success("Payroll approved");
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      }
    );
  }, [approvePayrollMutation, selectedMonth, qc]);

  const handleMarkPaid = useCallback((payrollId: number) => {
    markPaidMutation.mutate(
      { payrollId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: queryKeys.hr.payrolls({ month: selectedMonth }) });
          toast.success("Payroll marked as paid");
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      }
    );
  }, [markPaidMutation, selectedMonth, qc]);

  const totalGross =
    allPayrolls?.reduce((sum, p) => sum + parseFloat(p.grossSalary || "0"), 0) || 0;
  const totalNet =
    allPayrolls?.reduce((sum, p) => sum + parseFloat(p.netSalary || "0"), 0) || 0;

  if (isLoading) {
    return (
      <div className="space-y-6 px-4 sm:px-6 py-5">
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-[180px]" />
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-32 mb-1" />
                <Skeleton className="h-3 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-border/50"
                >
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageWrapper
      title="Payroll Management"
      subtitle="Generate and manage employee payrolls"
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

          <Button variant="outline" size="sm" onClick={() => setGenerateSheetOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Individual
          </Button>

          <GeneratePayrollSheet
            open={generateSheetOpen}
            onOpenChange={(open) => {
              if (!open) resetSheet();
              else setGenerateSheetOpen(true);
            }}
            employees={employees}
            selectedEmployee={selectedEmployee}
            onSelectedEmployeeChange={setSelectedEmployee}
            showPreview={showPreview}
            onShowPreview={handleShowPreview}
            onBackToEdit={() => setShowPreview(false)}
            lopDays={lopDays}
            onLopDaysChange={setLopDays}
            halfDays={halfDays}
            onHalfDaysChange={setHalfDays}
            bonus={bonus}
            onBonusChange={setBonus}
            otherDeductions={otherDeductions}
            onOtherDeductionsChange={setOtherDeductions}
            overtimeType={overtimeType}
            onOvertimeTypeChange={setOvertimeType}
            overtimeDays={overtimeDays}
            onOvertimeDaysChange={setOvertimeDays}
            overtimeHours={overtimeHours}
            onOvertimeHoursChange={setOvertimeHours}
            overtimeAmount={overtimeAmount}
            onOvertimeAmountChange={setOvertimeAmount}
            payslipPreview={payslipPreview}
            selectedEmployeeData={selectedEmployeeData}
            selectedMonth={selectedMonth}
            onConfirmGenerate={handleGenerateForEmployee}
            isGenerating={generateEmployeePayslipMutation.isPending}
          />

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
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Employees"
            value={allPayrolls?.length || 0}
            icon={Users}
            color="blue"
          />
          <StatCard
            label="Total Gross"
            value={`₹${totalGross.toLocaleString("en-IN")}`}
            icon={DollarSign}
            color="gold"
          />
          <StatCard
            label="Total Net Payout"
            value={`₹${totalNet.toLocaleString("en-IN")}`}
            icon={CreditCard}
            color="green"
          />
        </div>

        {(allPayrolls?.length ?? 0) === 0 ? (
          <EmptyState
            icon={FileText}
            title="No payroll records yet"
            description={`No payroll generated for ${format(new Date(selectedMonth + "-01"), "MMMM yyyy")}. Generate payroll for all employees or create one for an individual.`}
          />
        ) : (
          <PayrollTable
            payrolls={allPayrolls ?? []}
            selectedMonth={selectedMonth}
            onApprove={handleApprovePayroll}
            onMarkPaid={handleMarkPaid}
            isApprovePending={approvePayrollMutation.isPending}
            isMarkPaidPending={markPaidMutation.isPending}
          />
        )}
      </div>
    </PageWrapper>
  );
}
