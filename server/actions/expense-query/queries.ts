"use server";

import { db } from "@/lib/db";
import { expenses, expenseCategories, users } from "@/lib/db/schema";
import { eq, and, desc, gte, lte, sql, or, asc } from "drizzle-orm";
import { getAuthenticatedMember } from "@/lib/auth-helpers";
import { isAuthError } from "@/lib/auth-types";
import type {
  ExpenseFilters,
  ExpensePageData,
  ExpenseWithRelations,
  ExpenseStats,
  CategorySpending,
  ReportData,
} from "./types";
import {
  buildFilterConditions,
  fetchExpensesWithPagination,
  fetchAggregatedStats,
  fetchPendingExpenses,
  fetchCategories,
} from "./helpers";

export async function getExpensePageData(
  filters: ExpenseFilters = {}
): Promise<ExpensePageData | { error: string }> {
  const authResult = await getAuthenticatedMember();
  if (isAuthError(authResult)) {
    return { error: authResult.error };
  }

  const { isAdmin, userId, orgId } = authResult;
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;
  const conditions = buildFilterConditions(filters, orgId, isAdmin, userId);
  const [expenseData, statsData, categoriesData, pendingData] = await Promise.all([
    fetchExpensesWithPagination(
      conditions,
      page,
      pageSize,
      filters.sortBy,
      filters.sortOrder
    ),
    filters.includeStats !== false
      ? fetchAggregatedStats(buildFilterConditions({}, orgId, isAdmin, userId))
      : null,
    filters.includeCategories !== false ? fetchCategories(orgId) : [],
    isAdmin && filters.includePending !== false
      ? fetchPendingExpenses(orgId)
      : [],
  ]);

  return {
    expenses: expenseData.expenses,
    pendingExpenses: pendingData,
    stats: statsData,
    categories: categoriesData,
    pagination: {
      page,
      pageSize,
      total: expenseData.total,
      totalPages: Math.ceil(expenseData.total / pageSize),
    },
    appliedFilters: filters,
    isAdmin,
  };
}

export async function getExpensesForExport(
  filters: ExpenseFilters = {}
): Promise<{ expenses: ExpenseWithRelations[]; stats: ExpenseStats } | { error: string }> {
  const authResult = await getAuthenticatedMember();
  if (isAuthError(authResult)) {
    return { error: authResult.error };
  }

  const { isAdmin, userId, orgId } = authResult;
  const conditions = buildFilterConditions(filters, orgId, isAdmin, userId);

  const [expenseList, stats] = await Promise.all([
    db.query.expenses.findMany({
      where: and(...conditions),
      with: {
        user: true,
        approver: true,
        expenseCategory: true,
        project: true,
      },
      orderBy: [desc(expenses.expenseDate)],
    }),
    fetchAggregatedStats(conditions),
  ]);

  return {
    expenses: expenseList as ExpenseWithRelations[],
    stats,
  };
}

export async function getCategorySpendingOptimized(): Promise<CategorySpending[] | { error: string }> {
  const authResult = await getAuthenticatedMember();
  if (isAuthError(authResult)) {
    return { error: authResult.error };
  }

  if (!authResult.isAdmin) {
    return { error: "Permission denied" };
  }

  const { orgId } = authResult;
  const categories = await db.query.expenseCategories.findMany({
    where: and(
      eq(expenseCategories.orgId, orgId),
      eq(expenseCategories.isActive, true)
    ),
  });

  if (categories.length === 0) {
    return [];
  }
  const spendingData = await db
    .select({
      category: expenses.category,
      totalSpent: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} IN ('APPROVED', 'PAID') THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
      pendingAmount: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} = 'PENDING' THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
      approvedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} = 'APPROVED' THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
      paidAmount: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} = 'PAID' THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
      expenseCount: sql<number>`COUNT(*)`,
    })
    .from(expenses)
    .where(eq(expenses.orgId, orgId))
    .groupBy(expenses.category);
  const spendingMap = new Map(spendingData.map((s) => [s.category, s]));

  return categories.map((cat) => {
    const spending = spendingMap.get(cat.name);
    return {
      categoryId: cat.id,
      categoryName: cat.name,
      budgetLimit: parseFloat(cat.budgetLimit || "0"),
      budgetPeriod: cat.budgetPeriod || "MONTHLY",
      totalSpent: Number(spending?.totalSpent) || 0,
      pendingAmount: Number(spending?.pendingAmount) || 0,
      approvedAmount: Number(spending?.approvedAmount) || 0,
      paidAmount: Number(spending?.paidAmount) || 0,
      expenseCount: Number(spending?.expenseCount) || 0,
    };
  });
}

export async function getExpenseReportDataOptimized(
  filters: { startDate: string; endDate: string }
): Promise<ReportData | { error: string }> {
  const authResult = await getAuthenticatedMember();
  if (isAuthError(authResult)) {
    return { error: authResult.error };
  }

  const { isAdmin, userId, orgId } = authResult;

  const conditions = [
    eq(expenses.orgId, orgId),
    gte(expenses.expenseDate, filters.startDate),
    lte(expenses.expenseDate, filters.endDate),
  ];

  if (!isAdmin) {
    conditions.push(eq(expenses.userId, userId));
  }
  const [summary, byCategory, byEmployee, byMonth, byStatus, topExpenses] = await Promise.all([
    fetchAggregatedStats(conditions),
    db
      .select({
        category: expenses.category,
        count: sql<number>`COUNT(*)`,
        amount: sql<number>`COALESCE(SUM(CAST(${expenses.amount} AS DECIMAL)), 0)`,
      })
      .from(expenses)
      .where(and(...conditions))
      .groupBy(expenses.category)
      .orderBy(desc(sql`SUM(CAST(${expenses.amount} AS DECIMAL))`)),
    isAdmin
      ? db
          .select({
            userId: expenses.userId,
            firstName: users.firstName,
            lastName: users.lastName,
            count: sql<number>`COUNT(*)`,
            amount: sql<number>`COALESCE(SUM(CAST(${expenses.amount} AS DECIMAL)), 0)`,
          })
          .from(expenses)
          .leftJoin(users, eq(expenses.userId, users.id))
          .where(and(...conditions))
          .groupBy(expenses.userId, users.firstName, users.lastName)
          .orderBy(desc(sql`SUM(CAST(${expenses.amount} AS DECIMAL))`))
      : [],
    db
      .select({
        month: sql<string>`TO_CHAR(${expenses.expenseDate}::date, 'Mon YYYY')`,
        monthSort: sql<string>`TO_CHAR(${expenses.expenseDate}::date, 'YYYY-MM')`,
        count: sql<number>`COUNT(*)`,
        amount: sql<number>`COALESCE(SUM(CAST(${expenses.amount} AS DECIMAL)), 0)`,
      })
      .from(expenses)
      .where(and(...conditions))
      .groupBy(
        sql`TO_CHAR(${expenses.expenseDate}::date, 'Mon YYYY')`,
        sql`TO_CHAR(${expenses.expenseDate}::date, 'YYYY-MM')`
      )
      .orderBy(asc(sql`TO_CHAR(${expenses.expenseDate}::date, 'YYYY-MM')`)),
    db
      .select({
        status: expenses.status,
        count: sql<number>`COUNT(*)`,
        amount: sql<number>`COALESCE(SUM(CAST(${expenses.amount} AS DECIMAL)), 0)`,
      })
      .from(expenses)
      .where(and(...conditions))
      .groupBy(expenses.status),
    db.query.expenses.findMany({
      where: and(
        ...conditions,
        or(eq(expenses.status, "APPROVED"), eq(expenses.status, "PAID"))
      ),
      with: { user: true },
      orderBy: [desc(sql`CAST(${expenses.amount} AS DECIMAL)`)],
      limit: 10,
    }),
  ]);

  const totalAmount = summary.totalAmount || 1;

  return {
    summary,
    byCategory: byCategory.map((c) => ({
      category: c.category,
      count: Number(c.count),
      amount: Number(c.amount),
      percentage: (Number(c.amount) / totalAmount) * 100,
    })),
    byEmployee: (byEmployee as { userId: string | null; firstName: string | null; lastName: string | null; count: number; amount: number }[]).map((e) => ({
      userId: e.userId || "",
      userName: `${e.firstName || ""} ${e.lastName || ""}`.trim() || "Unknown",
      count: Number(e.count),
      amount: Number(e.amount),
    })),
    byMonth: byMonth.map((m) => ({
      month: m.month,
      count: Number(m.count),
      amount: Number(m.amount),
    })),
    byStatus: byStatus.map((s) => ({
      status: s.status || "PENDING",
      count: Number(s.count),
      amount: Number(s.amount),
    })),
    topExpenses: topExpenses.map((e) => ({
      id: e.id,
      category: e.category,
      amount: parseFloat(e.amount),
      description: e.description || "",
      userName: `${e.user?.firstName || ""} ${e.user?.lastName || ""}`.trim() || "Unknown",
      expenseDate: e.expenseDate,
      status: e.status || "PENDING",
    })),
  };
}
