"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calculator, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { Employee } from "@/types/hr";

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
  payslipPreview: PayslipPreview | null;
  selectedEmployeeData: Employee | null;
  selectedMonth: string;
  onBackToEdit: () => void;
  onConfirmGenerate: () => void;
  isGenerating: boolean;
}

export function PayslipDetailSheet({
  payslipPreview,
  selectedEmployeeData,
  selectedMonth,
  onBackToEdit,
  onConfirmGenerate,
  isGenerating,
}: PayslipDetailSheetProps) {
  return (
    <div className="space-y-6 pt-6">
      <Card className="border-2">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start gap-4">
            <div className="min-w-0">
              <CardTitle className="text-lg">
                {selectedEmployeeData?.firstName} {selectedEmployeeData?.lastName}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedEmployeeData?.designation || "Employee"}
              </p>
            </div>
            <Badge variant="outline" className="shrink-0">
              {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <h4 className="font-semibold text-sm mb-3 text-green-700">Earnings</h4>
            <div className="space-y-2 text-sm">
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
            <h4 className="font-semibold text-sm mb-3 text-red-700">Deductions</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Professional Tax</span>
                <span className="text-red-600">
                  -₹{payslipPreview?.professionalTax.toLocaleString()}
                </span>
              </div>
              {(payslipPreview?.lopDays || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    LOP Deduction ({payslipPreview?.lopDays} days)
                  </span>
                  <span className="text-red-600">
                    -₹{Math.round(payslipPreview?.lopDeduction || 0).toLocaleString()}
                  </span>
                </div>
              )}
              {(payslipPreview?.halfDays || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Half Day Deduction ({payslipPreview?.halfDays} days)
                  </span>
                  <span className="text-red-600">
                    -₹{Math.round(payslipPreview?.halfDayDeduction || 0).toLocaleString()}
                  </span>
                </div>
              )}
              {(payslipPreview?.otherDeductions || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Other Deductions</span>
                  <span className="text-red-600">
                    -₹{payslipPreview?.otherDeductions.toLocaleString()}
                  </span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-medium">
                <span>Total Deductions</span>
                <span className="text-red-600">
                  -₹{Math.round(payslipPreview?.totalDeductions || 0).toLocaleString()}
                </span>
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

          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
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

      <SheetFooter className="pt-4 gap-2 sm:gap-0">
        <Button variant="outline" onClick={onBackToEdit}>
          <Calculator className="mr-2 h-4 w-4" />
          Edit Details
        </Button>
        <Button onClick={onConfirmGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Confirm & Generate
        </Button>
      </SheetFooter>
    </div>
  );
}
