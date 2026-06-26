"use server";

import { db } from "@/lib/db";
import { expenses, expenseCategories, expenseStatusEnum } from "@/lib/db/schema";
import { eq, and, desc, gte, lte, sql, inArray, like, or, asc, count } from "drizzle-orm";
import type { ExpenseFilters, ExpenseStats, ExpenseWithRelations, ExpenseCategory } from "./types";

export function buildFilterConditions(
  filters: ExpenseFilters,
  orgId: string,
  isAdmin: boolean,
  userId: string
) {
  const conditions = [eq(expenses.orgId, orgId)];
  if (!isAdmin) {
    conditions.push(eq(expenses.userId, userId));
  } else if (filters.userId) {
    conditions.push(eq(expenses.userId, filters.userId));
  }
  if (filters.startDate) {
    conditions.push(gte(expenses.expenseDate, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(expenses.expenseDate, filters.endDate));
  }
  if (filters.month) {
    const [year, month] = filters.month.split('-');
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;
    conditions.push(gte(expenses.expenseDate, startDate));
    conditions.push(lte(expenses.expenseDate, endDate));
  }
  if (filters.categoryId) {
    conditions.push(eq(expenses.categoryId, filters.categoryId));
  }
  if (filters.category) {
    conditions.push(eq(expenses.category, filters.category));
  }
  if (filters.categoryIds?.length) {
    conditions.push(inArray(expenses.categoryId, filters.categoryIds));
  }
  if (filters.status) {
    type ExpenseStatus = (typeof expenseStatusEnum.enumValues)[number];
    if (Array.isArray(filters.status)) {
      if (filters.status.length > 0 && !filters.status.includes("all")) {
        conditions.push(inArray(expenses.status, filters.status as ExpenseStatus[]));
      }
    } else if (filters.status !== "all") {
      conditions.push(eq(expenses.status, filters.status as ExpenseStatus));
    }
  }
  if (filters.minAmount !== undefined && filters.minAmount > 0) {
    conditions.push(gte(sql`CAST(${expenses.amount} AS DECIMAL)`, filters.minAmount));
  }
  if (filters.maxAmount !== undefined && filters.maxAmount > 0) {
    conditions.push(lte(sql`CAST(${expenses.amount} AS DECIMAL)`, filters.maxAmount));
  }
  if (filters.paymentMethod && filters.paymentMethod !== "all") {
    conditions.push(eq(expenses.paymentMethod, filters.paymentMethod));
  }
  if (filters.projectId) {
    conditions.push(eq(expenses.projectId, filters.projectId));
  }
  if (filters.search && filters.search.trim()) {
    const searchTerm = `%${filters.search.trim().toLowerCase()}%`;
    conditions.push(
      or(
        like(sql`LOWER(${expenses.description})`, searchTerm),
        like(sql`LOWER(${expenses.category})`, searchTerm),
        like(sql`LOWER(${expenses.merchant})`, searchTerm)
      )!
    );
  }

  return conditions;
}

export async function fetchExpensesWithPagination(
  conditions: ReturnType<typeof buildFilterConditions>,
  page: number,
  pageSize: number,
  sortBy: string = "date",
  sortOrder: string = "desc"
) {
  const offset = (page - 1) * pageSize;
  const sortColumn = {
    date: expenses.expenseDate,
    amount: expenses.amount,
    category: expenses.category,
    status: expenses.status,
    created: expenses.createdAt,
  }[sortBy] || expenses.expenseDate;

  const orderFn = sortOrder === "asc" ? asc : desc;

  const [expenseList, countResult] = await Promise.all([
    db.query.expenses.findMany({
      where: and(...conditions),
      with: {
        user: true,
        approver: true,
        expenseCategory: true,
        project: true,
      },
      orderBy: [
        asc(sql`CASE ${expenses.status} WHEN 'PENDING' THEN 0 WHEN 'APPROVED' THEN 1 WHEN 'REJECTED' THEN 2 WHEN 'PAID' THEN 3 ELSE 4 END`),
        orderFn(sortColumn),
        desc(expenses.createdAt),
      ],
      limit: pageSize,
      offset: offset,
    }),
    db
      .select({ count: count() })
      .from(expenses)
      .where(and(...conditions)),
  ]);

  return {
    expenses: expenseList as ExpenseWithRelations[],
    total: countResult[0]?.count || 0,
  };
}

export async function fetchAggregatedStats(
  conditions: ReturnType<typeof buildFilterConditions>
): Promise<ExpenseStats> {
  const result = await db
    .select({
      totalAmount: sql<number>`COALESCE(SUM(CAST(${expenses.amount} AS DECIMAL)), 0)`,
      pendingAmount: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} = 'PENDING' THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
      approvedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} = 'APPROVED' THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
      rejectedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} = 'REJECTED' THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
      paidAmount: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} = 'PAID' THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
      totalCount: sql<number>`COUNT(*)`,
      pendingCount: sql<number>`COUNT(CASE WHEN ${expenses.status} = 'PENDING' THEN 1 END)`,
      approvedCount: sql<number>`COUNT(CASE WHEN ${expenses.status} = 'APPROVED' THEN 1 END)`,
      rejectedCount: sql<number>`COUNT(CASE WHEN ${expenses.status} = 'REJECTED' THEN 1 END)`,
      paidCount: sql<number>`COUNT(CASE WHEN ${expenses.status} = 'PAID' THEN 1 END)`,
    })
    .from(expenses)
    .where(and(...conditions));

  const stats = result[0];
  return {
    totalAmount: Number(stats?.totalAmount) || 0,
    pendingAmount: Number(stats?.pendingAmount) || 0,
    approvedAmount: Number(stats?.approvedAmount) || 0,
    rejectedAmount: Number(stats?.rejectedAmount) || 0,
    paidAmount: Number(stats?.paidAmount) || 0,
    totalCount: Number(stats?.totalCount) || 0,
    pendingCount: Number(stats?.pendingCount) || 0,
    approvedCount: Number(stats?.approvedCount) || 0,
    rejectedCount: Number(stats?.rejectedCount) || 0,
    paidCount: Number(stats?.paidCount) || 0,
    avgExpenseAmount: stats?.totalCount ? Number(stats.totalAmount) / Number(stats.totalCount) : 0,
  };
}

export async function fetchPendingExpenses(orgId: string): Promise<ExpenseWithRelations[]> {
  return (await db.query.expenses.findMany({
    where: and(
      eq(expenses.orgId, orgId),
      eq(expenses.status, "PENDING")
    ),
    with: {
      user: true,
      approver: true,
      expenseCategory: true,
      project: true,
    },
    orderBy: [desc(expenses.createdAt)],
  })) as ExpenseWithRelations[];
}

export async function fetchCategories(orgId: string): Promise<ExpenseCategory[]> {
  return await db.query.expenseCategories.findMany({
    where: and(
      eq(expenseCategories.orgId, orgId),
      eq(expenseCategories.isActive, true)
    ),
    orderBy: [expenseCategories.name],
  }) as ExpenseCategory[];
}
