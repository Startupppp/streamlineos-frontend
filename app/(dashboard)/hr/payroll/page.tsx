"use client";

import { useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { format, subMonths } from "date-fns";
import { toast } from "sonner";
import { Users, Loader2, Plus } from "lucide-react";
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
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Employee } from "@/types/hr";

import { PayrollTable } from "@/features/hr/payroll/payroll-table";
import { GeneratePayrollSheet } from "@/features/hr/payroll/generate-payroll-sheet";
import { PayrollStats } from "@/features/hr/payroll/payroll-stats";
import { PayrollPageSkeleton } from "@/features/hr/payroll/payroll-page-skeleton";
import { usePayslipForm } from "@/features/hr/payroll/use-payslip-form";

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
  const selectedMonth =
    searchParams.get("month") || format(new Date(), "yyyy-MM");

  const setSelectedMonth = useCallback(
    (month: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("month", month);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const { data: allPayrolls, isLoading } = useHrAllPayrolls({
    month: selectedMonth,
  });
  const { data: employeesRaw } = useHrEmployees();

  const employees = useMemo(
    () =>
      (Array.isArray(employeesRaw)
        ? employeesRaw
        : ((employeesRaw as { data?: Employee[] })?.data ?? [])) as Employee[],
    [employeesRaw],
  );

  const form = usePayslipForm({ employees });

  const generatePayrollMutation = useGeneratePayroll();
  const generateEmployeePayslipMutation = useGenerateEmployeePayslip();
  const approvePayrollMutation = useApprovePayroll();
  const markPaidMutation = useMarkPayrollPaid();

  const invalidate = useCallback(() => {
    qc.invalidateQueries({
      queryKey: queryKeys.hr.payrolls({ month: selectedMonth }),
    });
  }, [qc, selectedMonth]);

  const handleGenerateAll = useCallback(() => {
    generatePayrollMutation.mutate(
      { month: selectedMonth },
      {
        onSuccess: () => {
          invalidate();
          toast.success("Payroll generated for all employees");
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [generatePayrollMutation, selectedMonth, invalidate]);

  const handleShowPreview = useCallback(() => {
    if (!form.selectedEmployee) {
      toast.error("Please select an employee");
      return;
    }
    form.setShowPreview(true);
  }, [form]);

  const handleGenerateForEmployee = useCallback(() => {
    if (!form.selectedEmployee) return;
    generateEmployeePayslipMutation.mutate(
      {
        userId: form.selectedEmployee,
        month: form.formMonth,
        lopDays: parseFloat(form.lopDays) || 0,
        halfDays: parseFloat(form.halfDays) || 0,
        otherDeductions: parseFloat(form.otherDeductions) || 0,
        bonus: parseFloat(form.bonus) || 0,
        overtimeType:
          form.overtimeType === "days" || form.overtimeType === "hours"
            ? form.overtimeType
            : undefined,
        overtimeDays: parseFloat(form.overtimeDays) || 0,
        overtimeHours: parseFloat(form.overtimeHours) || 0,
        overtimeAmount: parseFloat(form.overtimeAmount) || 0,
      },
      {
        onSuccess: () => {
          invalidate();
          toast.success("Payslip generated successfully");
          form.reset();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [form, generateEmployeePayslipMutation, selectedMonth, invalidate]);

  const handleApprovePayroll = useCallback(
    (payrollId: number) => {
      approvePayrollMutation.mutate(
        { payrollId },
        {
          onSuccess: () => {
            invalidate();
            toast.success("Payroll approved");
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [approvePayrollMutation, invalidate],
  );

  const handleMarkPaid = useCallback(
    (payrollId: number) => {
      markPaidMutation.mutate(
        { payrollId },
        {
          onSuccess: () => {
            invalidate();
            toast.success("Payroll marked as paid");
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [markPaidMutation, invalidate],
  );

  const handleDownloadPayslip = useCallback((payrollId: number) => {
    window.open(`/api/hr/payrolls/${payrollId}/download`, "_blank");
  }, []);

  const totalGross =
    allPayrolls?.reduce(
      (sum, p) => sum + parseFloat(p.grossSalary || "0"),
      0,
    ) || 0;
  const totalNet =
    allPayrolls?.reduce(
      (sum, p) => sum + parseFloat(p.netSalary || "0"),
      0,
    ) || 0;

  if (isLoading) {
    return <PayrollPageSkeleton />;
  }

  return (
    <PageWrapper
      title="Payroll Management"
      subtitle="Generate and manage employee payrolls"
      actions={
        <div className="flex gap-2 flex-wrap">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[160px] sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
              {MONTHS.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => form.setOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Individual
          </Button>

          <GeneratePayrollSheet
            open={form.open}
            onOpenChange={(open) => {
              if (!open) form.reset();
              else form.setOpen(true);
            }}
            employees={employees}
            selectedEmployee={form.selectedEmployee}
            onSelectedEmployeeChange={form.setSelectedEmployee}
            showPreview={form.showPreview}
            onShowPreview={handleShowPreview}
            onBackToEdit={() => form.setShowPreview(false)}
            lopDays={form.lopDays}
            onLopDaysChange={form.setLopDays}
            halfDays={form.halfDays}
            onHalfDaysChange={form.setHalfDays}
            bonus={form.bonus}
            onBonusChange={form.setBonus}
            otherDeductions={form.otherDeductions}
            onOtherDeductionsChange={form.setOtherDeductions}
            overtimeType={form.overtimeType}
            onOvertimeTypeChange={form.setOvertimeType}
            overtimeDays={form.overtimeDays}
            onOvertimeDaysChange={form.setOvertimeDays}
            overtimeHours={form.overtimeHours}
            onOvertimeHoursChange={form.setOvertimeHours}
            overtimeAmount={form.overtimeAmount}
            onOvertimeAmountChange={form.setOvertimeAmount}
            payslipPreview={form.payslipPreview}
            selectedEmployeeData={form.selectedEmployeeData}
            formMonth={form.formMonth}
            onFormMonthChange={form.setFormMonth}
            onConfirmGenerate={handleGenerateForEmployee}
            isGenerating={generateEmployeePayslipMutation.isPending}
            isAttendanceLoading={form.isAttendanceLoading}
            hasAttendanceData={form.hasAttendanceData}
          />

          <Button
            onClick={handleGenerateAll}
            disabled={generatePayrollMutation.isPending}
          >
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
      <div className="space-y-4">
        <PayrollStats
          totalEmployees={allPayrolls?.length || 0}
          totalGross={totalGross}
          totalNet={totalNet}
        />

        {(allPayrolls?.length ?? 0) === 0 ? (
          <EmptyState
            illustration={<EmptyExpensesIllustration className="h-40 w-40" />}
            title="No payroll records yet"
            description={`No payroll generated for ${format(
              new Date(selectedMonth + "-01"),
              "MMMM yyyy",
            )}. Generate payroll for all employees or create one for an individual.`}
          />
        ) : (
          <PayrollTable
            payrolls={allPayrolls ?? []}
            selectedMonth={selectedMonth}
            onApprove={handleApprovePayroll}
            onMarkPaid={handleMarkPaid}
            isApprovePending={approvePayrollMutation.isPending}
            isMarkPaidPending={markPaidMutation.isPending}
            onDownload={handleDownloadPayslip}
          />
        )}
      </div>
    </PageWrapper>
  );
}
