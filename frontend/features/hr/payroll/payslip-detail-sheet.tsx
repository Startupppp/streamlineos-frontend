"use client";

import { Separator } from "@/components/ui/separator";
import { Calculator, Check, Info, TrendingUp, TrendingDown, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { HrSheet } from "@/features/hr/hr-sheet";
import type { Employee } from "@/types/hr";
import { cn } from "@/lib/utils";

export interface PayslipPreview {
  basicPay: number;
  hra: number;
  grossSalary: number;
  lopDeduction: number;
  halfDayDeduction: number;
  professionalTax: number;
  otherDeductions: number;
  bonus: number;
  overtimeAmount: number;
  overtimeType: string;
  overtimeDays: number;
  overtimeHours: number;
  totalDeductions: number;
  netSalary: number;
  lopDays: number;
  halfDays: number;
  workingDays: number;
  effectiveDays: number;
}

interface PayslipDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payslipPreview: PayslipPreview | null;
  selectedEmployeeData: Employee | null;
  formMonth: string;
  onBackToEdit: () => void;
  onConfirmGenerate: () => void;
  isGenerating: boolean;
  hasAttendanceData: boolean;
}

function LineItem({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: "default" | "positive" | "negative" | "bold";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={cn(
          "text-sm",
          variant === "bold" ? "font-semibold text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "text-sm tabular-nums font-medium",
          variant === "positive" && "text-emerald-600 dark:text-emerald-400",
          variant === "negative" && "text-rose-600 dark:text-rose-400",
          variant === "bold" && "font-semibold text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function PayslipDetailSheet({
  open,
  onOpenChange,
  payslipPreview,
  selectedEmployeeData,
  formMonth,
  onBackToEdit,
  onConfirmGenerate,
  isGenerating,
  hasAttendanceData,
}: PayslipDetailSheetProps) {
  const payPeriodLabel = format(new Date(formMonth + "-01"), "MMMM yyyy");
  const initials = [selectedEmployeeData?.firstName, selectedEmployeeData?.lastName]
    .filter(Boolean)
    .map((n) => n?.charAt(0).toUpperCase())
    .join("");

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Payslip Preview"
      description={`Review the payslip for ${selectedEmployeeData?.firstName ?? "employee"} before generating.`}
      onSubmit={onConfirmGenerate}
      onCancel={onBackToEdit}
      submitLabel={
        <span className="flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5" />
          Confirm & Generate
        </span>
      }
      cancelLabel={
        <span className="flex items-center gap-1.5">
          <Calculator className="h-3.5 w-3.5" />
          Edit
        </span>
      }
      isPending={isGenerating}
    >
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-l-4 border-l-emerald-500 px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  {initials || "?"}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {selectedEmployeeData?.firstName} {selectedEmployeeData?.lastName}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {selectedEmployeeData?.designation || "Employee"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
                <CalendarDays className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">{payPeriodLabel}</span>
            </div>
          </div>
        </div>

        <div className="px-4 py-3.5 space-y-4">
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Earnings
              </span>
            </div>
            <LineItem
              label="Basic Pay"
              value={`₹${payslipPreview?.basicPay.toLocaleString("en-IN") ?? 0}`}
            />
            <LineItem
              label="House Rent Allowance"
              value={`₹${payslipPreview?.hra.toLocaleString("en-IN") ?? 0}`}
            />
            {(payslipPreview?.bonus ?? 0) > 0 && (
              <LineItem
                label="Bonus / Incentive"
                value={`+₹${payslipPreview?.bonus.toLocaleString("en-IN")}`}
                variant="positive"
              />
            )}
            {(payslipPreview?.overtimeAmount ?? 0) > 0 && (
              <LineItem
                label={
                  payslipPreview?.overtimeType === "days"
                    ? `Overtime Pay (${payslipPreview.overtimeDays} days)`
                    : payslipPreview?.overtimeType === "hours"
                      ? `Overtime Pay (${payslipPreview.overtimeHours} hrs)`
                      : "Overtime Pay"
                }
                value={`+₹${payslipPreview?.overtimeAmount.toLocaleString("en-IN")}`}
                variant="positive"
              />
            )}
            <Separator />
            <LineItem
              label="Gross Salary"
              value={`₹${payslipPreview?.grossSalary.toLocaleString("en-IN") ?? 0}`}
              variant="bold"
            />
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingDown className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                Deductions
              </span>
            </div>
            <LineItem
              label="Professional Tax"
              value={`-₹${payslipPreview?.professionalTax.toLocaleString("en-IN") ?? 0}`}
              variant="negative"
            />
            {(payslipPreview?.lopDays ?? 0) > 0 && (
              <LineItem
                label={`LOP Deduction (${payslipPreview?.lopDays} days)`}
                value={`-₹${Math.round(payslipPreview?.lopDeduction ?? 0).toLocaleString("en-IN")}`}
                variant="negative"
              />
            )}
            {(payslipPreview?.halfDays ?? 0) > 0 && (
              <LineItem
                label={`Half Day (${payslipPreview?.halfDays} days)`}
                value={`-₹${Math.round(payslipPreview?.halfDayDeduction ?? 0).toLocaleString("en-IN")}`}
                variant="negative"
              />
            )}
            {(payslipPreview?.otherDeductions ?? 0) > 0 && (
              <LineItem
                label="Other Deductions"
                value={`-₹${payslipPreview?.otherDeductions.toLocaleString("en-IN")}`}
                variant="negative"
              />
            )}
            <Separator />
            <LineItem
              label="Total Deductions"
              value={`-₹${Math.round(payslipPreview?.totalDeductions ?? 0).toLocaleString("en-IN")}`}
              variant="bold"
            />
          </div>

          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 px-4 py-3.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Net Salary</span>
              <span className="text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                ₹{Math.round(payslipPreview?.netSalary ?? 0).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Working Days", value: String(payslipPreview?.workingDays ?? 0) },
              { label: "Effective Days", value: String(payslipPreview?.effectiveDays ?? 0) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg bg-muted/40 px-3 py-2.5 text-center">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                <p className="text-lg font-bold tabular-nums text-foreground mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {!hasAttendanceData && (
            <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-3 py-2.5">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span className="text-xs text-amber-800 dark:text-amber-300">
                This preview uses the base salary. The actual payslip will reflect attendance once processed.
              </span>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onBackToEdit}
        className="w-full text-xs text-muted-foreground hover:text-foreground py-1.5 transition-colors duration-200 underline-offset-4 hover:underline"
      >
        ← Back to Edit
      </button>
    </HrSheet>
  );
}
