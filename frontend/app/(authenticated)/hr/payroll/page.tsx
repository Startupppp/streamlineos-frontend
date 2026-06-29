"use client";

import { useMemo, useCallback, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { format, subMonths, getYear } from "date-fns";
import { toast } from "sonner";
import { Users, Loader2, Plus, AlertCircle } from "lucide-react";
import {
  useHrAllPayrolls,
  useHrEmployees,
  useGeneratePayroll,
  useGenerateEmployeePayslip,
  useApprovePayroll,
  useMarkPayrollPaid,
} from "@/hooks/api/hr";
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
import { apiClient } from "@/lib/api-client";
import type { Employee } from "@/types/hr";

import { PayrollTable } from "@/features/hr/payroll/payroll-table";
import { GeneratePayrollSheet } from "@/features/hr/payroll/generate-payroll-sheet";
import { PayrollStats } from "@/features/hr/payroll/payroll-stats";
import { PayrollPageSkeleton } from "@/features/hr/payroll/payroll-page-skeleton";
import { usePayslipForm } from "@/features/hr/payroll/use-payslip-form";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PayslipDetailSheet } from "@/features/hr/payslips/payslip-detail-sheet";
import type { PayrollWithUser } from "@/types/hr";

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const date = subMonths(new Date(), i);
  return {
    value: format(date, "yyyy-MM"),
    label: format(date, "MMMM yyyy"),
  };
});

const CURRENT_YEAR = getYear(new Date());
const YEARS = Array.from({ length: 5 }, (_, i) => String(CURRENT_YEAR - i));

export default function PayrollPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedMonth = searchParams.get("month") ?? undefined;
  const selectedYear = searchParams.get("year") ?? undefined;
  const viewMode = searchParams.get("view") as "month" | "year" | null;
  const activeView = viewMode ?? "month";
  const effectiveMonth = activeView === "month" ? (selectedMonth ?? format(new Date(), "yyyy-MM")) : undefined;
  const effectiveYear = activeView === "year" ? (selectedYear ?? String(CURRENT_YEAR)) : undefined;

  const setFilter = useCallback(
    (update: { month?: string; year?: string; view?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (update.view !== undefined) params.set("view", update.view);
      if (update.month !== undefined) { params.set("month", update.month); params.delete("year"); }
      if (update.year !== undefined) { params.set("year", update.year); params.delete("month"); }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const handleViewChange = useCallback((v: string) => setFilter({ view: v }), [setFilter]);
  const handleMonthChange = useCallback((m: string) => setFilter({ month: m, view: "month" }), [setFilter]);
  const handleYearChange = useCallback((y: string) => setFilter({ year: y, view: "year" }), [setFilter]);

  const { data: allPayrolls, isLoading, isError, refetch } = useHrAllPayrolls({
    month: effectiveMonth,
    year: effectiveYear,
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
  const [previewPayroll, setPreviewPayroll] = useState<PayrollWithUser | null>(null);

  const generatePayrollMutation = useGeneratePayroll();
  const generateEmployeePayslipMutation = useGenerateEmployeePayslip();
  const approvePayrollMutation = useApprovePayroll();
  const markPaidMutation = useMarkPayrollPaid();

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: queryKeys.hr.payrolls() });
  }, [qc]);

  function handleRetry() { void refetch(); }

  const handleGenerateAll = useCallback(() => {
    const month = effectiveMonth ?? format(new Date(), "yyyy-MM");
    generatePayrollMutation.mutate(
      { month },
      {
        onSuccess: () => {
          invalidate();
          toast.success("Payroll generated for all employees");
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [generatePayrollMutation, effectiveMonth, invalidate]);

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
  }, [form, generateEmployeePayslipMutation, invalidate]);

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

  const handleDownloadPayslip = useCallback(async (payrollId: number) => {
    try {
      const blob = await apiClient.download(`/hr/payrolls/${payrollId}/download`);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, []);

  const handlePreviewPayroll = useCallback((payroll: PayrollWithUser) => {
    setPreviewPayroll(payroll);
  }, []);

  const handleOpenIndividualSheet = useCallback(() => { form.setOpen(true); }, [form]);

  const handleIndividualSheetOpenChange = useCallback((open: boolean) => {
    if (!open) form.reset();
    else form.setOpen(true);
  }, [form]);

  const handleBackToEdit = useCallback(() => { form.setShowPreview(false); }, [form]);

  const handlePreviewSheetOpenChange = useCallback((open: boolean) => {
    if (!open) setPreviewPayroll(null);
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

  if (isError) {
    return (
      <PageWrapper title="Payroll Management" subtitle="Generate and manage employee payrolls">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AlertCircle className="h-10 w-10 text-destructive/60" />
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">Failed to load payroll data</p>
            <p className="text-xs text-muted-foreground mt-1">Something went wrong. Please try again.</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRetry}>Try Again</Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Payroll Management"
      subtitle="Generate and manage employee payrolls"
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/30 p-1">
            <Select value={activeView} onValueChange={handleViewChange}>
              <SelectTrigger className="h-7 w-[100px] border-0 bg-transparent shadow-none text-xs font-medium focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)]">
                <SelectItem value="month">By Month</SelectItem>
                <SelectItem value="year">By Year</SelectItem>
              </SelectContent>
            </Select>
            {activeView === "month" ? (
              <Select value={effectiveMonth} onValueChange={handleMonthChange}>
                <SelectTrigger className="h-7 w-[150px] border-0 bg-background shadow-sm rounded-lg text-xs font-medium focus:ring-0">
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
            ) : (
              <Select value={effectiveYear} onValueChange={handleYearChange}>
                <SelectTrigger className="h-7 w-[80px] border-0 bg-background shadow-sm rounded-lg text-xs font-medium focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={handleOpenIndividualSheet}
          >
            <Plus className="h-3.5 w-3.5" />
            Individual
          </Button>

          <GeneratePayrollSheet
            open={form.open}
            onOpenChange={handleIndividualSheetOpenChange}
            employees={employees}
            selectedEmployee={form.selectedEmployee}
            onSelectedEmployeeChange={form.setSelectedEmployee}
            showPreview={form.showPreview}
            onShowPreview={handleShowPreview}
            onBackToEdit={handleBackToEdit}
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
            size="sm"
            className="h-9 gap-1.5"
            onClick={handleGenerateAll}
            disabled={generatePayrollMutation.isPending}
          >
            {generatePayrollMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Users className="h-3.5 w-3.5" />
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
            description={
              activeView === "month"
                ? `No payroll generated for ${format(new Date((effectiveMonth ?? format(new Date(), "yyyy-MM")) + "-01"), "MMMM yyyy")}. Generate payroll for all employees or create one for an individual.`
                : `No payroll records found for ${effectiveYear}.`
            }
          />
        ) : (
          <PayrollTable
            payrolls={allPayrolls ?? []}
            title={
              activeView === "year"
                ? `Payroll — ${effectiveYear}`
                : `Payroll for ${format(new Date((effectiveMonth ?? format(new Date(), "yyyy-MM")) + "-01"), "MMMM yyyy")}`
            }
            groupByEmployee={activeView === "year"}
            onApprove={handleApprovePayroll}
            onMarkPaid={handleMarkPaid}
            isApprovePending={approvePayrollMutation.isPending}
            isMarkPaidPending={markPaidMutation.isPending}
            onDownload={handleDownloadPayslip}
            onPreview={handlePreviewPayroll}
          />
        )}
      </div>

      <Sheet open={!!previewPayroll} onOpenChange={handlePreviewSheetOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Payslip Preview</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <PayslipDetailSheet
              payslip={previewPayroll ? {
                month: previewPayroll.month,
                basicSalary: previewPayroll.basicSalary,
                hra: previewPayroll.hra,
                grossSalary: previewPayroll.grossSalary,
                deductions: previewPayroll.deductions,
                netSalary: previewPayroll.netSalary,
                overtimeAmount: previewPayroll.overtimeAmount,
                overtimeType: previewPayroll.overtimeType,
                overtimeDays: previewPayroll.overtimeDays,
                overtimeHours: previewPayroll.overtimeHours,
                user: previewPayroll.user ? {
                  firstName: previewPayroll.user.firstName,
                  lastName: previewPayroll.user.lastName,
                  designation: previewPayroll.user.designation,
                } : null,
              } : undefined}
            />
          </div>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
