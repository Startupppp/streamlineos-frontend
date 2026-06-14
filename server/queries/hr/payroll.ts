"server-only";

import { db } from "@/lib/db";
import {
  payrolls,
  salaryStructures,
  expenses,
  users,
} from "@/lib/db/schema";
import { incentives, incentiveConfig } from "@/lib/db/schema/crm";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import type {
  Payroll,
  PayrollWithUser,
  SalaryStructure,
  Expense,
  EmployeePayslip,
  Incentive,
  IncentivesResult,
  IncentiveStats,
  IncentiveConfig,
} from "@/types/hr";

export async function getPayrolls(orgId: string, userId: string): Promise<Payroll[]> {
  return db.query.payrolls.findMany({
    where: and(
      eq(payrolls.userId, userId),
      eq(payrolls.orgId, orgId)
    ),
    orderBy: [desc(payrolls.createdAt)],
  }) as unknown as Promise<Payroll[]>;
}

export async function getSalaryStructures(
  orgId: string,
  userId?: string,
  requestingUserId?: string,
  isAdmin?: boolean
): Promise<SalaryStructure[]> {
  const conditions = [eq(salaryStructures.orgId, orgId)];

  if (userId) {
    conditions.push(eq(salaryStructures.userId, userId));
  } else if (!isAdmin && requestingUserId) {
    conditions.push(eq(salaryStructures.userId, requestingUserId));
  }

  return db.query.salaryStructures.findMany({
    where: and(...conditions),
    orderBy: [desc(salaryStructures.effectiveFrom)],
  }) as unknown as Promise<SalaryStructure[]>;
}

export async function getExpenses(
  orgId: string,
  userId: string,
  isAdmin: boolean,
  params?: {
    filterUserId?: string;
    status?: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }
): Promise<{ data: Expense[]; total: number; page: number; limit: number; totalPages: number }> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions = [eq(expenses.orgId, orgId)];
  if (!isAdmin) {
    conditions.push(eq(expenses.userId, userId));
  } else if (params?.filterUserId) {
    conditions.push(eq(expenses.userId, params.filterUserId));
  }
  if (params?.status) conditions.push(eq(expenses.status, params.status));
  if (params?.startDate) conditions.push(gte(expenses.expenseDate, params.startDate));
  if (params?.endDate) conditions.push(lte(expenses.expenseDate, params.endDate));

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(expenses)
    .where(and(...conditions));

  const total = Number(countResult?.count || 0);

  const data = await db.query.expenses.findMany({
    where: and(...conditions),
    orderBy: [desc(expenses.expenseDate)],
    limit,
    offset,
  });

  return {
    data: data as unknown as Expense[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getAllPayrolls(orgId: string, month: string): Promise<PayrollWithUser[]> {
  const rows = await db
    .select({
      id: payrolls.id,
      orgId: payrolls.orgId,
      userId: payrolls.userId,
      month: payrolls.month,
      basicSalary: payrolls.basicSalary,
      hra: payrolls.hra,
      allowances: payrolls.allowances,
      deductions: payrolls.deductions,
      grossSalary: payrolls.grossSalary,
      netSalary: payrolls.netSalary,
      status: payrolls.status,
      generatedBy: payrolls.generatedBy,
      approvedBy: payrolls.approvedBy,
      overtimeType: payrolls.overtimeType,
      overtimeDays: payrolls.overtimeDays,
      overtimeHours: payrolls.overtimeHours,
      overtimeAmount: payrolls.overtimeAmount,
      payslipUrl: payrolls.payslipUrl,
      createdAt: payrolls.createdAt,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userDesignation: users.designation,
      userMonthlySalary: users.monthlySalary,
    })
    .from(payrolls)
    .innerJoin(users, eq(payrolls.userId, users.id))
    .where(and(eq(payrolls.orgId, orgId), eq(payrolls.month, month)))
    .orderBy(desc(payrolls.createdAt));

  return rows.map((r) => ({
    id: r.id,
    orgId: r.orgId,
    userId: r.userId,
    month: r.month,
    basicSalary: r.basicSalary,
    hra: r.hra,
    allowances: r.allowances,
    deductions: r.deductions,
    grossSalary: r.grossSalary,
    netSalary: r.netSalary,
    status: r.status,
    generatedBy: r.generatedBy,
    approvedBy: r.approvedBy,
    overtimeType: r.overtimeType,
    overtimeDays: r.overtimeDays,
    overtimeHours: r.overtimeHours,
    overtimeAmount: r.overtimeAmount,
    payslipUrl: r.payslipUrl,
    createdAt: r.createdAt,
    user: {
      firstName: r.userFirstName,
      lastName: r.userLastName,
      designation: r.userDesignation,
      monthlySalary: r.userMonthlySalary,
    },
  })) as PayrollWithUser[];
}

export async function getEmployeePayslips(orgId: string, userId: string): Promise<EmployeePayslip[]> {
  const rows = await db
    .select({
      id: payrolls.id,
      userId: payrolls.userId,
      month: payrolls.month,
      basicSalary: payrolls.basicSalary,
      hra: payrolls.hra,
      allowances: payrolls.allowances,
      deductions: payrolls.deductions,
      grossSalary: payrolls.grossSalary,
      netSalary: payrolls.netSalary,
      status: payrolls.status,
      overtimeType: payrolls.overtimeType,
      overtimeDays: payrolls.overtimeDays,
      overtimeHours: payrolls.overtimeHours,
      overtimeAmount: payrolls.overtimeAmount,
    })
    .from(payrolls)
    .where(and(eq(payrolls.orgId, orgId), eq(payrolls.userId, userId)))
    .orderBy(desc(payrolls.month));

  return rows as unknown as EmployeePayslip[];
}

export async function getIncentives(
  orgId: string,
  params?: { status?: string; page?: number; limit?: number }
): Promise<IncentivesResult> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions = [eq(incentives.orgId, orgId)];
  if (params?.status) {
    conditions.push(eq(incentives.status, params.status as "PENDING" | "APPROVED" | "REJECTED" | "ADDED_TO_PAYROLL"));
  }

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(incentives)
    .where(and(...conditions));

  const total = Number(countResult?.count || 0);

  const rows = await db
    .select({
      id: incentives.id,
      orgId: incentives.orgId,
      salesRepId: incentives.salesRepId,
      clientAccountId: incentives.clientAccountId,
      investmentAmount: incentives.investmentAmount,
      incentiveRate: incentives.incentiveRate,
      calculatedAmount: incentives.calculatedAmount,
      approvedAmount: incentives.approvedAmount,
      status: incentives.status,
      notes: incentives.notes,
      createdAt: incentives.createdAt,
      salesRepName: users.name,
      salesRepImage: users.image,
    })
    .from(incentives)
    .innerJoin(users, eq(incentives.salesRepId, users.id))
    .where(and(...conditions))
    .orderBy(desc(incentives.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    incentives: rows.map((r) => ({
      id: r.id,
      orgId: r.orgId,
      salesRepId: r.salesRepId,
      clientAccountId: r.clientAccountId,
      investmentAmount: r.investmentAmount,
      incentiveRate: r.incentiveRate,
      calculatedAmount: r.calculatedAmount,
      approvedAmount: r.approvedAmount,
      status: r.status,
      notes: r.notes,
      createdAt: r.createdAt,
      salesRep: { id: r.salesRepId, name: r.salesRepName, image: r.salesRepImage },
    })) as Incentive[],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getIncentiveStats(orgId: string): Promise<IncentiveStats> {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [allRows, monthRows] = await Promise.all([
    db.query.incentives.findMany({
      where: eq(incentives.orgId, orgId),
    }),
    db.query.incentives.findMany({
      where: and(
        eq(incentives.orgId, orgId),
        gte(incentives.createdAt, new Date(monthStart))
      ),
    }),
  ]);

  let totalRevenue = 0;
  let approved = 0;
  let pending = 0;
  let thisMonth = 0;

  for (const inc of allRows) {
    const amount = Number(inc.calculatedAmount || 0);
    totalRevenue += amount;
    if (inc.status === "APPROVED" || inc.status === "ADDED_TO_PAYROLL") approved++;
    if (inc.status === "PENDING") pending++;
  }
  for (const inc of monthRows) {
    thisMonth += Number(inc.calculatedAmount || 0);
  }

  return {
    thisMonth: thisMonth.toFixed(2),
    totalRevenue: totalRevenue.toFixed(2),
    avgPerConversion: approved > 0 ? (totalRevenue / approved).toFixed(2) : "0.00",
    pending,
    approved,
  };
}

export async function getIncentiveConfigs(orgId: string): Promise<IncentiveConfig[]> {
  const rows = await db
    .select({
      id: incentiveConfig.id,
      orgId: incentiveConfig.orgId,
      incentiveRate: incentiveConfig.incentiveRate,
      effectiveFrom: incentiveConfig.effectiveFrom,
      createdAt: incentiveConfig.createdAt,
      createdByName: users.name,
    })
    .from(incentiveConfig)
    .leftJoin(users, eq(incentiveConfig.createdBy, users.id))
    .where(and(eq(incentiveConfig.orgId, orgId), eq(incentiveConfig.isActive, true)))
    .orderBy(desc(incentiveConfig.effectiveFrom));

  return rows as IncentiveConfig[];
}
