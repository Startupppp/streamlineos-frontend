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
  useDeletePayroll,
  useHrSalaryStructures,
  useResendPayslipEmail,
} from "@/lib/api/hooks/hr";
import { useOvertimePreview } from "@/lib/api/hooks/hr/payroll-extended";
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
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subMonths } from "date-fns";
import { toast } from "sonner";
import { Users, Loader2, DollarSign, CreditCard, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { Employee, PayrollWithUser } from "@/types/hr";

import { PayrollTable } from "@/features/hr/payroll/payroll-table";
import { PayrollRecordPreviewSheet } from "@/features/hr/payroll/payroll-record-preview-sheet";
import { GeneratePayrollSheet } from "@/features/hr/payroll/generate-payroll-sheet";
import {
  buildPayslipPreviewFromEmployee,
  PROFESSIONAL_TAX_INR,
} from "@/lib/hr/payroll-calculations";
import {
  pickSalaryStructureForPayrollMonth,
  resolvePayrollMonthlyCtc,
} from "@/lib/hr/salary-effective-dates";

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
  const [previewPayroll, setPreviewPayroll] = useState<PayrollWithUser | null>(null);
  const [generateSheetOpen, setGenerateSheetOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const [lopDays, setLopDays] = useState<string>("");
  const [halfDays, setHalfDays] = useState<string>("");
  const [otherDeductions, setOtherDeductions] = useState<string>("");
  const [bonus, setBonus] = useState<string>("");
  const [leaves, setLeaves] = useState<string>("");

  const { data: allPayrolls, isLoading } = useHrAllPayrolls({ month: selectedMonth });
  const { data: employeesRaw } = useHrEmployees();
  const { data: salaryStructures } = useHrSalaryStructures(selectedEmployee || undefined);
  const { data: overtimePreview } = useOvertimePreview(
    { userId: selectedEmployee, month: selectedMonth },
  );

  const employees = useMemo(
    () =>
      (Array.isArray(employeesRaw)
        ? employeesRaw
        : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[],
    [employeesRaw]
  );

  const salaryStructureList = useMemo(() => {
    if (!salaryStructures) return [];
    return Array.isArray(salaryStructures) ? salaryStructures : [];
  }, [salaryStructures]);

  const activeSalary = useMemo(() => {
    return salaryStructureList.find((s) => s.isActive) ?? null;
  }, [salaryStructureList]);

  const pickedStructureForMonth = useMemo(
    () => pickSalaryStructureForPayrollMonth(salaryStructureList, selectedMonth),
    [salaryStructureList, selectedMonth]
  );

  const salaryRowForPreview = pickedStructureForMonth ?? activeSalary;

  const generatePayrollMutation = useGeneratePayroll();
  const generateEmployeePayslipMutation = useGenerateEmployeePayslip();
  const approvePayrollMutation = useApprovePayroll();
  const markPaidMutation = useMarkPayrollPaid();
  const resendPayslipEmailMutation = useResendPayslipEmail();
  const deletePayrollMutation = useDeletePayroll();

  const selectedEmployeeData = useMemo(() => {
    if (!selectedEmployee || !employees.length) return null;
    return employees.find((e) => e.id === selectedEmployee) ?? null;
  }, [selectedEmployee, employees]);

  const payslipPreview = useMemo(() => {
    if (!selectedEmployeeData) return null;

    const otAmt = overtimePreview?.overtimeAmount ?? 0;
    const employeeMonthlySalary = parseFloat(selectedEmployeeData.monthlySalary || "0");
    const structureDeductions = parseFloat(salaryRowForPreview?.deductions ?? "0");

    const targetCtc = resolvePayrollMonthlyCtc({
      picked: pickedStructureForMonth,
      fallbackStructure: activeSalary,
      employeeMonthlySalary,
    });
    if (targetCtc <= 0) return null;

    return buildPayslipPreviewFromEmployee({
      monthlySalary: targetCtc,
      month: selectedMonth,
      lopDays: parseFloat(lopDays) || 0,
      halfDays: parseFloat(halfDays) || 0,
      otherDeductions: parseFloat(otherDeductions) || 0,
      bonus: parseFloat(bonus) || 0,
      overtimeAmount: otAmt,
      overtimeType: otAmt > 0 ? "days" : "",
      overtimeDays: overtimePreview?.overtimeDays ?? 0,
      overtimeHours: 0,
      salaryStructureDeductions: structureDeductions,
      professionalTax: PROFESSIONAL_TAX_INR,
    });
  }, [
    selectedEmployeeData,
    selectedMonth,
    lopDays,
    halfDays,
    otherDeductions,
    bonus,
    overtimePreview,
    pickedStructureForMonth,
    salaryRowForPreview,
    activeSalary,
  ]);

  const resetSheet = () => {
    setGenerateSheetOpen(false);
    setSelectedEmployee("");
    setShowPreview(false);
    setLopDays("");
    setHalfDays("");
    setOtherDeductions("");
    setBonus("");
    setLeaves("");
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
    const monthly = parseFloat(selectedEmployeeData?.monthlySalary || "0");
    const targetCtc = resolvePayrollMonthlyCtc({
      picked: pickedStructureForMonth,
      fallbackStructure: activeSalary,
      employeeMonthlySalary: monthly,
    });
    if (targetCtc <= 0) {
      toast.error(
        "Set the employee’s monthly salary or add a salary structure before preview."
      );
      return;
    }
    setShowPreview(true);
  }, [selectedEmployee, selectedEmployeeData, pickedStructureForMonth, activeSalary]);

  const handleGenerateForEmployee = useCallback(() => {
    if (!selectedEmployee) return;
    const leavesTrimmed = leaves.trim();
    generateEmployeePayslipMutation.mutate(
      {
        userId: selectedEmployee,
        month: selectedMonth,
        lopDays: parseFloat(lopDays) || 0,
        halfDays: parseFloat(halfDays) || 0,
        otherDeductions: parseFloat(otherDeductions) || 0,
        bonus: parseFloat(bonus) || 0,
        ...(leavesTrimmed !== "" && !Number.isNaN(parseFloat(leavesTrimmed))
          ? { leaveDays: parseFloat(leavesTrimmed) }
          : {}),
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
  }, [selectedEmployee, generateEmployeePayslipMutation, selectedMonth, lopDays, halfDays, otherDeductions, bonus, leaves, qc]);

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

  const reportEmailOutcome = useCallback(
    (data: { emailSent: boolean; emailError?: string }, opts: { onSuccessText: string }) => {
      if (data.emailSent) {
        toast.success(opts.onSuccessText);
        return;
      }
      const msg =
        data.emailError === "no_email"
          ? "Payslip email was not sent: employee has no email on file."
          : data.emailError === "send_failed"
            ? "Payslip email could not be sent. Check server logs and use Resend once the issue is fixed."
            : data.emailError === "missing_dob"
              ? "Payslip email was not sent: add employee date of birth (onboarding) before emailing payslips."
              : data.emailError === "pdf_not_encrypted"
                ? "Payslip email was not sent: PDF encryption (qpdf) is unavailable on this server."
                : "Payslip email was not sent.";
      toast.warning(msg);
    },
    []
  );

  const handleMarkPaid = useCallback((payrollId: number) => {
    markPaidMutation.mutate(
      { payrollId },
      {
        onSuccess: (data) => {
          qc.invalidateQueries({ queryKey: queryKeys.hr.payrolls({ month: selectedMonth }) });
          toast.success("Payroll marked as paid");
          if (!data.emailSent) {
            reportEmailOutcome(data, { onSuccessText: "" });
          }
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      }
    );
  }, [markPaidMutation, selectedMonth, qc, reportEmailOutcome]);

  const handleResendEmail = useCallback((payrollId: number) => {
    resendPayslipEmailMutation.mutate(
      { payrollId },
      {
        onSuccess: (data) => {
          reportEmailOutcome(data, { onSuccessText: "Payslip email resent." });
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      }
    );
  }, [resendPayslipEmailMutation, reportEmailOutcome]);

  const handleDownloadPayslip = useCallback((payrollId: number) => {
    window.open(`/api/hr/payrolls/${payrollId}/download`, "_blank");
  }, []);

  const handleDeletePayroll = useCallback(
    (payrollId: number) => {
      deletePayrollMutation.mutate(
        { payrollId },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.hr.payrolls({ month: selectedMonth }) });
            toast.success("Draft payroll deleted");
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        }
      );
    },
    [deletePayrollMutation, selectedMonth, qc]
  );

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
          <div className="flex items-center gap-2 flex-wrap">
            <Skeleton className="h-9 w-[180px]" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-7 w-32" />
                </div>
                <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
              </div>
            </div>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-3 border-b border-border/50"
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
        <div className="flex gap-2 flex-wrap">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[160px] sm:w-[180px]">
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

          <Button variant="outline" onClick={() => setGenerateSheetOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
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
            leaves={leaves}
            onLeavesChange={setLeaves}
            overtimePreview={selectedEmployee ? overtimePreview : null}
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
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
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
            illustration={<EmptyExpensesIllustration className="h-40 w-40" />}
            title="No payroll records yet"
            description={`No payroll generated for ${format(new Date(selectedMonth + "-01"), "MMMM yyyy")}. Generate payroll for all employees or create one for an individual.`}
          />
        ) : (
          <PayrollTable
            payrolls={allPayrolls ?? []}
            selectedMonth={selectedMonth}
            onPreview={setPreviewPayroll}
            onApprove={handleApprovePayroll}
            onMarkPaid={handleMarkPaid}
            onDelete={handleDeletePayroll}
            isApprovePending={approvePayrollMutation.isPending}
            isMarkPaidPending={markPaidMutation.isPending}
            isDeletePending={deletePayrollMutation.isPending}
            onDownload={handleDownloadPayslip}
            onResendEmail={handleResendEmail}
            isResendPending={resendPayslipEmailMutation.isPending}
          />
        )}

        <PayrollRecordPreviewSheet
          open={!!previewPayroll}
          onOpenChange={(open) => {
            if (!open) setPreviewPayroll(null);
          }}
          payroll={previewPayroll}
        />
      </div>
    </PageWrapper>
  );
}
