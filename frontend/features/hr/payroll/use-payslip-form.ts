"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import type { Employee } from "@/types/hr";
import { useHrMonthlyAttendance } from "@/hooks/api/hr";

interface UsePayslipFormArgs {
  employees: Employee[];
}

export function usePayslipForm({ employees }: UsePayslipFormArgs) {
  const [open, setOpen] = useState(false);
  const [formMonth, setFormMonth] = useState<string>(
    format(new Date(), "yyyy-MM"),
  );
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

  const [payYear, payMonthOneIndexed] = formMonth.split("-").map(Number);
  const payMonthZeroIndexed = payMonthOneIndexed - 1;

  const { data: monthlyAttendance, isLoading: isAttendanceLoading } =
    useHrMonthlyAttendance({
      userId: selectedEmployee,
      year: payYear,
      month: payMonthZeroIndexed,
    });

  useEffect(() => {
    if (!selectedEmployee || !monthlyAttendance || isAttendanceLoading) return;

    const daysInMonth = new Date(payYear, payMonthOneIndexed, 0).getDate();
    const attendedDates = new Set(
      monthlyAttendance.map((l) => l.date.slice(0, 10)),
    );

    let absentCount = 0;
    let halfDayCount = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${payYear}-${String(payMonthOneIndexed).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayOfWeek = new Date(dateStr).getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const log = monthlyAttendance.find(
        (l) => l.date.slice(0, 10) === dateStr,
      );
      if (!log && !attendedDates.has(dateStr)) {
        absentCount++;
      } else if (log?.status === "HALF_DAY") {
        halfDayCount++;
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLopDays(absentCount > 0 ? String(absentCount) : "");
    setHalfDays(halfDayCount > 0 ? String(halfDayCount) : "");
  }, [
    selectedEmployee,
    monthlyAttendance,
    isAttendanceLoading,
    payYear,
    payMonthOneIndexed,
  ]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLopDays("");
    setHalfDays("");
  }, [selectedEmployee]);

  const selectedEmployeeData = useMemo(() => {
    if (!selectedEmployee || !employees.length) return null;
    return employees.find((e) => e.id === selectedEmployee) ?? null;
  }, [selectedEmployee, employees]);

  const payslipPreview = useMemo(() => {
    if (!selectedEmployeeData) return null;

    const monthlySalary = parseFloat(selectedEmployeeData.monthlySalary || "0");
    const workingDays = new Date(payYear, payMonthOneIndexed, 0).getDate();
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
    payYear,
    payMonthOneIndexed,
    lopDays,
    halfDays,
    otherDeductions,
    bonus,
    overtimeType,
    overtimeDays,
    overtimeHours,
    overtimeAmount,
  ]);

  const hasAttendanceData = useMemo(
    () => !!monthlyAttendance && monthlyAttendance.length > 0,
    [monthlyAttendance],
  );

  const reset = useCallback(() => {
    setOpen(false);
    setFormMonth(format(new Date(), "yyyy-MM"));
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
    formMonth,
    setFormMonth,
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
    isAttendanceLoading,
    hasAttendanceData,
    reset,
  };
}
