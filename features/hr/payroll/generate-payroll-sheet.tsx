"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Eye, CalendarDays } from "lucide-react";
import { HrSheet } from "@/features/hr/hr-sheet";
import type { Employee } from "@/types/hr";
import { PayslipDetailSheet, type PayslipPreview } from "./payslip-detail-sheet";
import { format, subMonths } from "date-fns";
import { Loader2 } from "lucide-react";

const FORM_MONTHS = Array.from({ length: 24 }, (_, i) => {
  const date = subMonths(new Date(), i);
  return {
    value: format(date, "yyyy-MM"),
    label: format(date, "MMMM yyyy"),
  };
});

interface GeneratePayrollSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  selectedEmployee: string;
  onSelectedEmployeeChange: (value: string) => void;
  showPreview: boolean;
  onShowPreview: () => void;
  onBackToEdit: () => void;
  lopDays: string;
  onLopDaysChange: (value: string) => void;
  halfDays: string;
  onHalfDaysChange: (value: string) => void;
  bonus: string;
  onBonusChange: (value: string) => void;
  otherDeductions: string;
  onOtherDeductionsChange: (value: string) => void;
  overtimeType: string;
  onOvertimeTypeChange: (value: string) => void;
  overtimeDays: string;
  onOvertimeDaysChange: (value: string) => void;
  overtimeHours: string;
  onOvertimeHoursChange: (value: string) => void;
  overtimeAmount: string;
  onOvertimeAmountChange: (value: string) => void;
  payslipPreview: PayslipPreview | null;
  selectedEmployeeData: Employee | null;
  formMonth: string;
  onFormMonthChange: (value: string) => void;
  onConfirmGenerate: () => void;
  isGenerating: boolean;
  isAttendanceLoading?: boolean;
  hasAttendanceData?: boolean;
}

export function GeneratePayrollSheet({
  open,
  onOpenChange,
  employees,
  selectedEmployee,
  onSelectedEmployeeChange,
  showPreview,
  onShowPreview,
  onBackToEdit,
  lopDays,
  onLopDaysChange,
  halfDays,
  onHalfDaysChange,
  bonus,
  onBonusChange,
  otherDeductions,
  onOtherDeductionsChange,
  overtimeType,
  onOvertimeTypeChange,
  overtimeDays,
  onOvertimeDaysChange,
  overtimeHours,
  onOvertimeHoursChange,
  overtimeAmount,
  onOvertimeAmountChange,
  payslipPreview,
  selectedEmployeeData,
  formMonth,
  onFormMonthChange,
  onConfirmGenerate,
  isGenerating,
  isAttendanceLoading,
  hasAttendanceData,
}: GeneratePayrollSheetProps) {
  const payPeriodLabel = format(new Date(formMonth + "-01"), "MMMM yyyy");

  if (showPreview) {
    return (
      <PayslipDetailSheet
        open={open}
        onOpenChange={onOpenChange}
        payslipPreview={payslipPreview}
        selectedEmployeeData={selectedEmployeeData}
        formMonth={formMonth}
        onBackToEdit={onBackToEdit}
        onConfirmGenerate={onConfirmGenerate}
        isGenerating={isGenerating}
        hasAttendanceData={hasAttendanceData ?? false}
      />
    );
  }

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Generate Payslip"
      description="Select a period and employee. LOP and half days are pre-filled from actual attendance data and can be adjusted."
      onSubmit={onShowPreview}
      submitLabel={
        <>
          <Eye className="h-4 w-4 mr-1.5" />
          Preview Payslip
        </>
      }
      isPending={false}
    >
      <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5">
        <CalendarDays className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-medium text-primary">
          Generating payroll for: {payPeriodLabel}
        </span>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Payroll Period</label>
        <Select value={formMonth} onValueChange={onFormMonthChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {FORM_MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Employee</label>
        <Select value={selectedEmployee} onValueChange={onSelectedEmployeeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select employee" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName} — ₹{parseFloat(emp.monthlySalary || "0").toLocaleString("en-IN")}/month
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedEmployeeData && (
        <>
          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Attendance Adjustments
              </p>
              {isAttendanceLoading && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  Loading attendance...
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">LOP Days</label>
                <Input
                  type="number"
                  min="0"
                  max="30"
                  value={lopDays}
                  onChange={(e) => onLopDaysChange(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Half Days</label>
                <Input
                  type="number"
                  min="0"
                  max="30"
                  value={halfDays}
                  onChange={(e) => onHalfDaysChange(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Additional Adjustments
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Bonus / Incentive (₹)</label>
                <Input
                  type="number"
                  min="0"
                  value={bonus}
                  onChange={(e) => onBonusChange(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Other Deductions (₹)</label>
                <Input
                  type="number"
                  min="0"
                  value={otherDeductions}
                  onChange={(e) => onOtherDeductionsChange(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Overtime
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Overtime Type</label>
                <Select value={overtimeType} onValueChange={onOvertimeTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {overtimeType === "days" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Overtime Days</label>
                  <Input
                    type="number"
                    min="0"
                    value={overtimeDays}
                    onChange={(e) => onOvertimeDaysChange(e.target.value)}
                    placeholder="0"
                  />
                </div>
              )}
              {overtimeType === "hours" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Overtime Hours</label>
                  <Input
                    type="number"
                    min="0"
                    value={overtimeHours}
                    onChange={(e) => onOvertimeHoursChange(e.target.value)}
                    placeholder="0"
                  />
                </div>
              )}
            </div>
            {overtimeType && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Overtime Amount (₹)</label>
                <Input
                  type="number"
                  min="0"
                  value={overtimeAmount}
                  onChange={(e) => onOvertimeAmountChange(e.target.value)}
                  placeholder="0"
                />
              </div>
            )}
          </div>
        </>
      )}
    </HrSheet>
  );
}
