import { db } from "@/lib/db";
import { expenses, expenseStatusEnum } from "@/lib/db/schema";
import { eq, and, desc, gte, lte, sql, inArray, like, or } from "drizzle-orm";
import type { ExportFilters, ExportExpense } from "./types";

export function buildExportConditions(
  filters: ExportFilters,
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
    const [year, month] = filters.month.split("-");
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month}-${lastDay.toString().padStart(2, "0")}`;
    conditions.push(gte(expenses.expenseDate, startDate));
    conditions.push(lte(expenses.expenseDate, endDate));
  }
  if (filters.categoryId) {
    conditions.push(eq(expenses.categoryId, filters.categoryId));
  }
  if (filters.category) {
    conditions.push(eq(expenses.category, filters.category));
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
    conditions.push(
      gte(sql`CAST(${expenses.amount} AS DECIMAL)`, filters.minAmount)
    );
  }
  if (filters.maxAmount !== undefined && filters.maxAmount > 0) {
    conditions.push(
      lte(sql`CAST(${expenses.amount} AS DECIMAL)`, filters.maxAmount)
    );
  }
  if (filters.paymentMethod && filters.paymentMethod !== "all") {
    conditions.push(eq(expenses.paymentMethod, filters.paymentMethod));
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

export async function fetchExpensesForExport(
  conditions: ReturnType<typeof buildExportConditions>
): Promise<ExportExpense[]> {
  const expenseList = await db.query.expenses.findMany({
    where: and(...conditions),
    with: {
      user: true,
      approver: true,
    },
    orderBy: [desc(expenses.expenseDate)],
  });

  return expenseList.map((e) => ({
    id: e.id,
    expenseDate: e.expenseDate,
    category: e.category,
    description: e.description,
    merchant: e.merchant,
    amount: e.amount,
    status: e.status,
    paymentMethod: e.paymentMethod,
    userName: `${e.user?.firstName || ""} ${e.user?.lastName || ""}`.trim() || "Unknown",
    userEmail: e.user?.email || "",
    approverName: e.approver
      ? `${e.approver.firstName || ""} ${e.approver.lastName || ""}`.trim()
      : null,
    approvedAt: e.approvedAt,
    rejectionReason: e.rejectionReason,
    paidAt: e.paidAt,
    transactionRef: e.transactionRef,
  }));
}

export async function fetchExportStats(
  conditions: ReturnType<typeof buildExportConditions>
) {
  const result = await db
    .select({
      totalAmount: sql<number>`COALESCE(SUM(CAST(${expenses.amount} AS DECIMAL)), 0)`,
      pendingAmount: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} = 'PENDING' THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
      approvedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} = 'APPROVED' THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
      paidAmount: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} = 'PAID' THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
      rejectedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} = 'REJECTED' THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
      totalCount: sql<number>`COUNT(*)`,
    })
    .from(expenses)
    .where(and(...conditions));

  return result[0];
}
