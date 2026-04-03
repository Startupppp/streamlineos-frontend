"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FileText, Eye } from "lucide-react";
import type { Employee } from "@/types/hr";
import { PayslipDetailSheet, type PayslipPreview } from "./payslip-detail-sheet";

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
  selectedMonth,
  onConfirmGenerate,
  isGenerating,
}: GeneratePayrollSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline">
          <FileText className="mr-2 h-4 w-4" />
          Generate Individual
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {showPreview ? "Payslip Preview" : "Generate Payslip for Employee"}
          </SheetTitle>
        </SheetHeader>

        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {showPreview
            ? `Payslip preview for ${selectedEmployeeData?.firstName ?? "employee"}`
            : ""}
        </div>

        {!showPreview ? (
          <div className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label>Select Employee</Label>
              <Select value={selectedEmployee} onValueChange={onSelectedEmployeeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} -{" "}
                      ₹{parseFloat(emp.monthlySalary || "0").toLocaleString()}/month
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedEmployeeData && (
              <>
                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    Attendance Adjustments
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lopDays">LOP Days (Loss of Pay)</Label>
                      <Input
                        id="lopDays"
                        type="number"
                        min="0"
                        max="30"
                        value={lopDays}
                        onChange={(e) => onLopDaysChange(e.target.value)}
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
                        onChange={(e) => onHalfDaysChange(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    Additional Adjustments
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bonus">Bonus / Incentive (₹)</Label>
                      <Input
                        id="bonus"
                        type="number"
                        min="0"
                        value={bonus}
                        onChange={(e) => onBonusChange(e.target.value)}
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
                        onChange={(e) => onOtherDeductionsChange(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    Overtime
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label id="overtime-type-label">Overtime Type</Label>
                      <Select value={overtimeType} onValueChange={onOvertimeTypeChange}>
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
                          onChange={(e) => onOvertimeDaysChange(e.target.value)}
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
                          onChange={(e) => onOvertimeHoursChange(e.target.value)}
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
                        onChange={(e) => onOvertimeAmountChange(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            <SheetFooter className="pt-4 gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={onShowPreview} disabled={!selectedEmployee}>
                <Eye className="mr-2 h-4 w-4" />
                Preview Payslip
              </Button>
            </SheetFooter>
          </div>
        ) : (
          <PayslipDetailSheet
            payslipPreview={payslipPreview}
            selectedEmployeeData={selectedEmployeeData}
            selectedMonth={selectedMonth}
            onBackToEdit={onBackToEdit}
            onConfirmGenerate={onConfirmGenerate}
            isGenerating={isGenerating}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
