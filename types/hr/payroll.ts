import { PayrollStatus } from "./common";

export interface Payroll {
  id: number;
  orgId: string;
  userId: string;
  month: string;
  basicSalary: string;
  hra: string | null;
  allowances: string | null;
  deductions: string | null;
  grossSalary: string;
  netSalary: string;
  status: PayrollStatus | null;
  generatedBy: string | null;
  approvedBy: string | null;
  overtimeType: string | null;
  overtimeDays: string | null;
  overtimeHours: string | null;
  overtimeAmount: string | null;
  payslipUrl: string | null;
  createdAt: Date | string | null;
}

export interface SalaryStructure {
  id: number;
  orgId: string;
  userId: string;
  basicSalary: string;
  hraPercentage: string | null;
  allowances: string | null;
  deductions: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export interface EmployeePayslip {
  id: number;
  userId: string;
  month: string;
  basicSalary: string;
  hra: string | null;
  allowances: string | null;
  deductions: string | null;
  grossSalary: string;
  netSalary: string;
  status: PayrollStatus | null;
  overtimeType: string | null;
  overtimeDays: string | null;
  overtimeHours: string | null;
  overtimeAmount: string | null;
  user?: {
    firstName: string | null;
    lastName: string | null;
    designation: string | null;
    joiningDate: string | null;
    employeeId: string | null;
    taxId: string | null;
    bankDetails: unknown;
  } | null;
}

export interface PayrollWithUser extends Payroll {
  user?: {
    firstName: string | null;
    lastName: string | null;
    designation: string | null;
    monthlySalary: string | null;
  } | null;
}

export interface GetAllPayrollsInput {
  month: string;
}

export interface GetEmployeePayslipsInput {
  userId?: string;
}

export interface GeneratePayrollInput {
  month: string;
}

export interface GenerateEmployeePayslipInput {
  userId: string;
  month: string;
  lopDays?: number;
  halfDays?: number;
  otherDeductions?: number;
  bonus?: number;
  overtimeType?: "days" | "hours";
  overtimeDays?: number;
  overtimeHours?: number;
  overtimeAmount?: number;
}

export interface ApprovePayrollInput {
  payrollId: number;
}

export interface MarkPayrollPaidInput {
  payrollId: number;
}

export interface CreateSalaryStructureInput {
  userId: string;
  basicSalary: number;
  hraPercentage: number;
  allowances: number;
  deductions: number;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string;
}
