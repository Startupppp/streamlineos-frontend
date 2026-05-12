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
import { HrSheet } from "@/features/hr/hr-sheet";
import type { Employee } from "@/types/hr";
import { PayslipDetailSheet, type PayslipPreview } from "./payslip-detail-sheet";
import type { OvertimePreview } from "@/lib/api/hooks/hr/payroll-extended";

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
  leaves: string;
  onLeavesChange: (value: string) => void;
  overtimePreview: OvertimePreview | null | undefined;
  payslipPreview: PayslipPreview | null;
  selectedEmployeeData: Employee | null;
  selectedMonth: string;
  onConfirmGenerate: () => void;
  isGenerating: boolean;
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
  leaves,
  onLeavesChange,
  overtimePreview,
  payslipPreview,
  selectedEmployeeData,
  selectedMonth,
  onConfirmGenerate,
  isGenerating,
}: GeneratePayrollSheetProps) {

  if (showPreview) {
    return (
      <PayslipDetailSheet
        open={open}
        onOpenChange={onOpenChange}
        payslipPreview={payslipPreview}
        selectedEmployeeData={selectedEmployeeData}
        selectedMonth={selectedMonth}
        onBackToEdit={onBackToEdit}
        onConfirmGenerate={onConfirmGenerate}
        isGenerating={isGenerating}
      />
    );
  }

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Generate Payslip"
      description="Select an employee and adjust attendance and bonus before previewing. Salary changes are ad hoc with no suggested increment; a new salary always takes effect from the 1st of a calendar month (see HR policy / OPEN_QUESTIONS.md)."
      onSubmit={onShowPreview}
      submitLabel="Preview Payslip"
      isPending={false}
    >
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
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Attendance Adjustments
            </p>
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
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Leaves</label>
              <Input
                type="number"
                min="0"
                max="31"
                value={leaves}
                onChange={(e) => onLeavesChange(e.target.value)}
                placeholder="Auto from approved leaves"
              />
              <p className="text-[11px] text-muted-foreground">
                Display-only on the payslip. Leave blank to use the auto-counted approved leaves for the month.
              </p>
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

          {overtimePreview != null && (
            <>
              <Separator />
              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1 text-sm">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Auto-Detected Overtime
                </p>
                {overtimePreview.overtimeDays > 0 ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Eligible days</span>
                      <span className="font-medium">{overtimePreview.overtimeDays}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Daily rate</span>
                      <span className="font-medium">₹{overtimePreview.dailyRate.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">OT amount</span>
                      <span className="font-semibold text-green-700">+₹{overtimePreview.overtimeAmount.toLocaleString("en-IN")}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground pt-1">
                      Dates: {overtimePreview.eligibleDates.join(", ")}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground text-xs">No approved holiday/Sunday work with extra pay found for this month.</p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </HrSheet>
  );
}
