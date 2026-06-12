"use client";

import { useCallback, useMemo, useState } from "react";
import type { Employee } from "@/types/hr";

interface UsePayslipFormArgs {
  selectedMonth: string;
  employees: Employee[];
}

/**
 * Consolidates the individual-payslip generator state machine:
 * - field state (lop, half days, deductions, bonus, overtime)
 * - derived preview calculation
 * - sheet open/close + reset
 */
export function usePayslipForm({ selectedMonth, employees }: UsePayslipFormArgs) {
  const [open, setOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const [lopDays, setLopDays] = useState("");
  const [halfDays, setHalfDays] = useState("");
  const [otherDeductions, setOtherDeductions] = useState("");
  const [bonus, setBonus] = useState("");
  const [overtimeType, setOvertimeType] = useState("");
  const [overtimeDays, setOvertimeDays] = useState("");
  const [overtimeHours, setOvertimeHours] = useState("");
  const [overtimeAmount, setOvertimeAmount] = useState("");

  const selectedEmployeeData = useMemo(() => {
    if (!selectedEmployee || !employees.length) return null;
    return employees.find((e) => e.id === selectedEmployee) ?? null;
  }, [selectedEmployee, employees]);

  const payslipPreview = useMemo(() => {
    if (!selectedEmployeeData) return null;

    const monthlySalary = parseFloat(selectedEmployeeData.monthlySalary || "0");
    const [payYear, payMonthNum] = selectedMonth.split("-").map(Number);
    const workingDays = new Date(payYear, payMonthNum, 0).getDate();
    const perDaySalary = monthlySalary / workingDays;
    const lop = parseFloat(lopDays) || 0;
    const half = parseFloat(halfDays) || 0;
    const lopDeduction = lop * perDaySalary;
    const halfDayDeduction = (half * perDaySalary) / 2;
    const basicPay = monthlySalary * 0.5;
    const hra = monthlySalary * 0.25;
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
      lopDays: lop,
      halfDays: half,
      workingDays,
      effectiveDays: workingDays - lop - half * 0.5,
    };
  }, [
    selectedEmployeeData,
    selectedMonth,
    lopDays,
    halfDays,
    otherDeductions,
    bonus,
    overtimeType,
    overtimeDays,
    overtimeHours,
    overtimeAmount,
  ]);

  const reset = useCallback(() => {
    setOpen(false);
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
  }, []);

  return {
    open,
    setOpen,
    selectedEmployee,
    setSelectedEmployee,
    showPreview,
    setShowPreview,
    lopDays,
    setLopDays,
    halfDays,
    setHalfDays,
    otherDeductions,
    setOtherDeductions,
    bonus,
    setBonus,
    overtimeType,
    setOvertimeType,
    overtimeDays,
    setOvertimeDays,
    overtimeHours,
    setOvertimeHours,
    overtimeAmount,
    setOvertimeAmount,
    selectedEmployeeData,
    payslipPreview,
    reset,
  };
}
