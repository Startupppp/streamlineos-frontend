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
import { Eye, CalendarDays, Loader2, Clock, Gift, Timer, User } from "lucide-react";
import { HrSheet } from "@/features/hr/hr-sheet";
import type { Employee } from "@/types/hr";
import { PayslipDetailSheet, type PayslipPreview } from "./payslip-detail-sheet";
import { format, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
      {children}
    </label>
  );
}

function SectionHeader({
  icon: Icon,
  label,
  containerClass,
  iconClass,
  trailing,
}: {
  icon: React.ElementType;
  label: string;
  containerClass: string;
  iconClass: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", containerClass)}>
          <Icon className={cn("h-3.5 w-3.5", iconClass)} />
        </div>
        <span className="text-sm font-semibold text-foreground">{label}</span>
      </div>
      {trailing}
    </div>
  );
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

  const handleLopDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => onLopDaysChange(e.target.value);
  const handleHalfDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => onHalfDaysChange(e.target.value);
  const handleBonusChange = (e: React.ChangeEvent<HTMLInputElement>) => onBonusChange(e.target.value);
  const handleOtherDeductionsChange = (e: React.ChangeEvent<HTMLInputElement>) => onOtherDeductionsChange(e.target.value);
  const handleOvertimeDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => onOvertimeDaysChange(e.target.value);
  const handleOvertimeHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => onOvertimeHoursChange(e.target.value);
  const handleOvertimeAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => onOvertimeAmountChange(e.target.value);

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
        <span className="flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5" />
          Preview Payslip
        </span>
      }
      isPending={false}
    >
      <div className="flex items-center gap-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 px-3.5 py-2.5">
        <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
          <CalendarDays className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider">Pay Period</p>
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">{payPeriodLabel}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <FieldLabel>Payroll Period</FieldLabel>
        <Select value={formMonth} onValueChange={onFormMonthChange}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent className="w-[var(--radix-select-trigger-width)]">
            {FORM_MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <FieldLabel>Employee</FieldLabel>
        <Select value={selectedEmployee} onValueChange={onSelectedEmployeeChange}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select employee" />
          </SelectTrigger>
          <SelectContent className="w-[var(--radix-select-trigger-width)]">
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName} — ₹{parseFloat(emp.monthlySalary || "0").toLocaleString("en-IN")}/mo
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedEmployeeData ? (
        <>
          <Separator />

          <div className="space-y-3">
            <SectionHeader
              icon={Clock}
              label="Attendance Adjustments"
              containerClass="bg-amber-100 dark:bg-amber-950/40"
              iconClass="text-amber-600 dark:text-amber-400"
              trailing={
                isAttendanceLoading ? (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    Loading…
                  </span>
                ) : null
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <FieldLabel>LOP Days</FieldLabel>
                <Input
                  type="number"
                  min="0"
                  max="30"
                  value={lopDays}
                  onChange={handleLopDaysChange}
                  placeholder="0"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Half Days</FieldLabel>
                <Input
                  type="number"
                  min="0"
                  max="30"
                  value={halfDays}
                  onChange={handleHalfDaysChange}
                  placeholder="0"
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <SectionHeader
              icon={Gift}
              label="Additional Adjustments"
              containerClass="bg-emerald-100 dark:bg-emerald-950/40"
              iconClass="text-emerald-600 dark:text-emerald-400"
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <FieldLabel>Bonus / Incentive (₹)</FieldLabel>
                <Input
                  type="number"
                  min="0"
                  value={bonus}
                  onChange={handleBonusChange}
                  placeholder="0"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Other Deductions (₹)</FieldLabel>
                <Input
                  type="number"
                  min="0"
                  value={otherDeductions}
                  onChange={handleOtherDeductionsChange}
                  placeholder="0"
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <SectionHeader
              icon={Timer}
              label="Overtime"
              containerClass="bg-violet-100 dark:bg-violet-950/40"
              iconClass="text-violet-600 dark:text-violet-400"
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <FieldLabel>Overtime Type</FieldLabel>
                <Select value={overtimeType} onValueChange={onOvertimeTypeChange}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="w-[var(--radix-select-trigger-width)]">
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {overtimeType === "days" && (
                <div className="space-y-1.5">
                  <FieldLabel>Overtime Days</FieldLabel>
                  <Input
                    type="number"
                    min="0"
                    value={overtimeDays}
                    onChange={handleOvertimeDaysChange}
                    placeholder="0"
                    className="h-9"
                  />
                </div>
              )}
              {overtimeType === "hours" && (
                <div className="space-y-1.5">
                  <FieldLabel>Overtime Hours</FieldLabel>
                  <Input
                    type="number"
                    min="0"
                    value={overtimeHours}
                    onChange={handleOvertimeHoursChange}
                    placeholder="0"
                    className="h-9"
                  />
                </div>
              )}
            </div>
            {overtimeType && (
              <div className="space-y-1.5">
                <FieldLabel>Overtime Amount (₹)</FieldLabel>
                <Input
                  type="number"
                  min="0"
                  value={overtimeAmount}
                  onChange={handleOvertimeAmountChange}
                  placeholder="0"
                  className="h-9"
                />
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl border border-dashed border-border/60 bg-muted/20">
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-3">
            <User className="h-5 w-5 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-semibold text-foreground">Select an employee</p>
          <p className="text-xs text-muted-foreground mt-0.5">Choose an employee above to configure their payslip</p>
        </div>
      )}
    </HrSheet>
  );
}
