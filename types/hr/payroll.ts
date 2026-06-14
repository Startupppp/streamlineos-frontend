export type PayrollStatus = "DRAFT" | "APPROVED" | "PAID";
export type ExpenseStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";

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

export interface Expense {
  id: number;
  orgId: string;
  userId: string;
  categoryId: number | null;
  category: string;
  amount: string;
  currency: string | null;
  description: string | null;
  receiptUrl: string | null;
  receiptFileName: string | null;
  merchant: string | null;
  paymentMethod: string | null;
  projectId: number | null;
  status: ExpenseStatus | null;
  approverId: string | null;
  approvedAt: Date | string | null;
  rejectionReason: string | null;
  paidAt: Date | string | null;
  transactionRef: string | null;
  expenseDate: string;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export interface PaginatedExpenses {
  data: Expense[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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

export interface IncentiveConfig {
  id: number;
  orgId: string;
  incentiveRate: string;
  effectiveFrom: string | Date;
  createdAt: Date | string | null;
  createdByName: string | null;
}

export interface Incentive {
  id: number;
  orgId: string;
  salesRepId: string;
  clientAccountId: number | null;
  investmentAmount: string;
  incentiveRate: string;
  calculatedAmount: string;
  approvedAmount: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "ADDED_TO_PAYROLL";
  notes: string | null;
  createdAt: Date | string | null;
  salesRep?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  clientAccount?: {
    clientName: string | null;
  } | null;
}

export interface IncentivesResult {
  incentives: Incentive[];
  total: number;
  page: number;
  totalPages: number;
}

export interface IncentiveStats {
  thisMonth: string;
  totalRevenue: string;
  avgPerConversion: string;
  pending: number;
  approved: number;
}

export interface GeneratePayrollInput {
  month: string;
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

export interface CreateExpenseInput {
  category: string;
  categoryId?: number;
  amount: number;
  description?: string;
  receiptUrl?: string;
  receiptFileName?: string;
  merchant?: string;
  paymentMethod?: string;
  projectId?: number;
  expenseDate: Date | string;
}

export interface UpdateExpenseStatusInput {
  expenseId: number;
  status: "APPROVED" | "REJECTED" | "PAID";
  rejectionReason?: string;
}

export interface GetEmployeePayslipsInput {
  userId?: string;
}

export interface GetAllPayrollsInput {
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

export interface GetIncentivesInput {
  status?: "PENDING" | "APPROVED" | "REJECTED" | "ADDED_TO_PAYROLL";
  page?: number;
  limit?: number;
}

export interface ApproveIncentiveInput {
  id: number;
  approvedAmount: string;
  notes?: string;
}

export interface RejectIncentiveInput {
  id: number;
}

export interface SetIncentiveConfigInput {
  incentiveRate: string;
}
