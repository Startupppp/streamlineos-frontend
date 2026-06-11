"use server";

import { db } from "@/lib/db";
import { getSessionAbility } from "@/lib/abilities-server";
import { expenses, expenseCategories, organizationMembers } from "@/lib/db/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { notifyByRoles } from "@/server/actions/create-notification";
import { ROLES } from "@/lib/constants/roles";
import { getExpenseMember } from "./_helpers";

interface CreateExpenseInput {
  category: string;
  categoryId?: number;
  amount: number;
  description?: string;
  receiptUrl?: string;
  receiptFileName?: string;
  merchant?: string;
  paymentMethod?: string;
  projectId?: number;
  expenseDate: string;
}

export async function createExpense(data: CreateExpenseInput) {
  const ctx = await getExpenseMember();
  if (!ctx) return { error: "Unauthorized" };
  const { session, member } = ctx;

  const duplicateCheck = await db.query.expenses.findFirst({
    where: and(
      eq(expenses.orgId, member.orgId),
      eq(expenses.userId, session.user.id),
      eq(expenses.amount, data.amount.toString()),
      eq(expenses.expenseDate, data.expenseDate),
      ...(data.merchant ? [eq(expenses.merchant, data.merchant)] : []),
    ),
    columns: { id: true },
  });
  if (duplicateCheck) {
    return {
      error: "Duplicate expense detected. An expense with the same amount, date, and merchant already exists.",
      isDuplicate: true,
    };
  }
  if (data.categoryId) {
    const cat = await db.query.expenseCategories.findFirst({
      where: eq(expenseCategories.id, data.categoryId),
    });
    if (cat?.budgetLimit && parseFloat(cat.budgetLimit) > 0) {
      const period = (cat.budgetPeriod || "MONTHLY").toUpperCase();
      const now = new Date();
      let periodStart: string;
      if (period === "YEARLY") {
        periodStart = `${now.getFullYear()}-01-01`;
      } else {
        const m = String(now.getMonth() + 1).padStart(2, "0");
        periodStart = `${now.getFullYear()}-${m}-01`;
      }
      const [spent] = await db
        .select({ total: sql<string>`COALESCE(SUM(${expenses.amount}::numeric), 0)` })
        .from(expenses)
        .where(
          and(
            eq(expenses.orgId, member.orgId),
            eq(expenses.userId, session.user.id),
            eq(expenses.categoryId, data.categoryId),
            gte(expenses.expenseDate, periodStart),
          )
        );
      const totalSpent = parseFloat(spent?.total ?? "0") + data.amount;
      const limit = parseFloat(cat.budgetLimit);
      if (totalSpent > limit) {
        const remaining = Math.max(0, limit - parseFloat(spent?.total ?? "0"));
        return {
          error: `This expense would exceed the ${period.toLowerCase()} budget limit of ₹${limit.toLocaleString()} for "${cat.name}". You have ₹${remaining.toLocaleString()} remaining.`,
          isOverBudget: true,
        };
      }
    }
  }

  try {
    const [expense] = await db.insert(expenses).values({
      orgId: member.orgId,
      userId: session.user.id,
      category: data.category,
      categoryId: data.categoryId,
      amount: data.amount.toString(),
      description: data.description,
      receiptUrl: data.receiptUrl,
      receiptFileName: data.receiptFileName,
      merchant: data.merchant,
      paymentMethod: data.paymentMethod,
      projectId: data.projectId,
      expenseDate: data.expenseDate,
      status: "PENDING",
    }).returning();

    try {
      await notifyByRoles(member.orgId, [ROLES.CEO, ROLES.HR], {
        type: "INFO",
        title: "New Expense Submitted",
        message: `A new expense of ₹${data.amount.toLocaleString()} has been submitted for "${data.category}".`,
        link: "/hr/expenses",
        metadata: { expenseId: expense.id, amount: data.amount, category: data.category },
        excludeUserId: session.user.id,
      });
    } catch (notifError) {
      logger.error("Failed to send expense creation notification", notifError);
    }

    revalidatePath("/hr/expenses");
    return { success: true, expense };
  } catch (error) {
    logger.error("Failed to create expense", error);
    return { error: "Failed to create expense" };
  }
}

export async function updateExpense(expenseId: number, data: Partial<CreateExpenseInput>) {
  const ctx = await getExpenseMember();
  if (!ctx) return { error: "Unauthorized" };
  const { session, member } = ctx;

  try {
    const existing = await db.query.expenses.findFirst({
      where: and(
        eq(expenses.id, expenseId),
        eq(expenses.orgId, member.orgId),
      ),
    });

    if (!existing) return { error: "Expense not found" };

    const isOwner = existing.userId === session.user.id;
    const ability = await getSessionAbility();
    const isAdminRole = ability.can("approve", "hr:expenses");

    if (!isOwner && !isAdminRole) return { error: "Permission denied" };
    if (existing.status !== "PENDING" && !isAdminRole) return { error: "Can only edit pending expenses" };

    await db.update(expenses)
      .set({
        ...(data.category && { category: data.category }),
        ...(data.amount !== undefined && { amount: data.amount.toString() }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.merchant !== undefined && { merchant: data.merchant }),
        ...(data.paymentMethod !== undefined && { paymentMethod: data.paymentMethod }),
        ...(data.expenseDate && { expenseDate: data.expenseDate }),
        ...(data.receiptUrl !== undefined && { receiptUrl: data.receiptUrl }),
        ...(data.receiptFileName !== undefined && { receiptFileName: data.receiptFileName }),
        updatedAt: new Date(),
      })
      .where(eq(expenses.id, expenseId));

    revalidatePath("/hr/expenses");
    return { success: true };
  } catch (error) {
    logger.error("Failed to update expense", error);
    return { error: "Failed to update expense" };
  }
}

export async function getExpenses(filters?: {
  userId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  categoryId?: number;
}) {
  const ctx = await getExpenseMember();
  if (!ctx) return [];
  const { session, member } = ctx;

  const ability = await getSessionAbility();


  const isAdmin = ability.can("approve", "hr:expenses");

  const conditions = [eq(expenses.orgId, member.orgId)];

  if (!isAdmin) {
    conditions.push(eq(expenses.userId, session.user.id));
  } else if (filters?.userId) {
    conditions.push(eq(expenses.userId, filters.userId));
  }

  if (filters?.status && filters.status !== "all") {
    const validStatuses = ["PENDING", "APPROVED", "REJECTED", "PAID"] as const;
    const status = validStatuses.find(s => s === filters.status);
    if (status) {
      conditions.push(eq(expenses.status, status));
    }
  }

  if (filters?.startDate) {
    conditions.push(gte(expenses.expenseDate, filters.startDate));
  }

  if (filters?.endDate) {
    conditions.push(lte(expenses.expenseDate, filters.endDate));
  }

  if (filters?.categoryId) {
    conditions.push(eq(expenses.categoryId, filters.categoryId));
  }

  return await db.query.expenses.findMany({
    where: and(...conditions),
    with: {
      user: true,
      approver: true,
      expenseCategory: true,
      project: true,
    },
    orderBy: [desc(expenses.createdAt)],
  });
}

export async function getMyExpenses() {
  const ctx = await getExpenseMember();
  if (!ctx) return [];
  const { session, member } = ctx;

  return await db.query.expenses.findMany({
    where: and(
      eq(expenses.orgId, member.orgId),
      eq(expenses.userId, session.user.id)
    ),
    with: {
      user: true,
      approver: true,
      expenseCategory: true,
      project: true,
    },
    orderBy: [desc(expenses.createdAt)],
  });
}

export async function getPendingExpenses() {
  const ctx = await getExpenseMember();
  if (!ctx) return [];
  const { member } = ctx;

  const ability = await getSessionAbility();


  if (!ability.can("approve", "hr:expenses")) {
    return [];
  }

  return await db.query.expenses.findMany({
    where: and(
      eq(expenses.orgId, member.orgId),
      eq(expenses.status, "PENDING")
    ),
    with: {
      user: true,
      approver: true,
      expenseCategory: true,
      project: true,
    },
    orderBy: [desc(expenses.createdAt)],
  });
}

export async function deleteExpense(expenseId: number) {
  const ctx = await getExpenseMember();
  if (!ctx) return { error: "Unauthorized" };
  const { session, member } = ctx;

  const expense = await db.query.expenses.findFirst({
    where: and(
      eq(expenses.id, expenseId),
      eq(expenses.orgId, member.orgId)
    ),
  });

  if (!expense) return { error: "Expense not found" };

  const isOwner = expense.userId === session.user.id;
  const ability = await getSessionAbility();

  const isAdmin = ability.can("approve", "hr:expenses");
  const isPending = expense.status === "PENDING";

  if (!isAdmin && (!isOwner || !isPending)) {
    return { error: "Permission denied" };
  }

  try {
    await db.delete(expenses).where(eq(expenses.id, expenseId));
    revalidatePath("/hr/expenses");
    return { success: true };
  } catch (error) {
    logger.error("Failed to delete expense", error);
    return { error: "Failed to delete expense" };
  }
}

export async function getExpenseCategories() {
  const ctx = await getExpenseMember();
  if (!ctx) return [];
  const { session, member } = ctx;

  return await db.query.expenseCategories.findMany({
    where: and(
      eq(expenseCategories.orgId, member.orgId),
      eq(expenseCategories.isActive, true)
    ),
    orderBy: [expenseCategories.name],
  });
}

export async function createExpenseCategory(data: {
  name: string;
  description?: string;
  budgetLimit?: number;
  budgetPeriod?: string;
}) {
  const ctx = await getExpenseMember();
  if (!ctx) return { error: "Unauthorized" };
  const { session, member } = ctx;

  const ability = await getSessionAbility();


  if (!ability.can("approve", "hr:expenses")) {
    return { error: "Permission denied" };
  }

  try {
    const [category] = await db.insert(expenseCategories).values({
      orgId: member.orgId,
      name: data.name,
      description: data.description,
      budgetLimit: data.budgetLimit?.toString(),
      budgetPeriod: data.budgetPeriod || "MONTHLY",
    }).returning();

    revalidatePath("/hr/expenses");
    return { success: true, category };
  } catch (error) {
    logger.error("Failed to create category", error);
    return { error: "Failed to create category" };
  }
}

export async function getExpenseStats() {
  const ctx = await getExpenseMember();
  if (!ctx) return null;
  const { session, member } = ctx;

  const ability = await getSessionAbility();


  const isAdmin = ability.can("approve", "hr:expenses");
  const conditions = [eq(expenses.orgId, member.orgId)];

  if (!isAdmin) {
    conditions.push(eq(expenses.userId, session.user.id));
  }

  const allExpenses = await db.query.expenses.findMany({
    where: and(...conditions),
  });

  const totalAmount = allExpenses.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);
  const pendingAmount = allExpenses
    .filter(e => e.status === "PENDING")
    .reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);
  const approvedAmount = allExpenses
    .filter(e => e.status === "APPROVED" || e.status === "PAID")
    .reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);
  const pendingCount = allExpenses.filter(e => e.status === "PENDING").length;

  return {
    totalAmount,
    pendingAmount,
    approvedAmount,
    pendingCount,
    totalCount: allExpenses.length,
  };
}

export async function getCategorySpending() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  const ability = await getSessionAbility();


  if (!member || !ability.can("approve", "hr:expenses")) {
    return [];
  }

  const categories = await db.query.expenseCategories.findMany({
    where: and(
      eq(expenseCategories.orgId, member.orgId),
      eq(expenseCategories.isActive, true)
    ),
  });

  const allExpenses = await db.query.expenses.findMany({
    where: eq(expenses.orgId, member.orgId),
  });

  return categories.map(cat => {
    const categoryExpenses = allExpenses.filter(e => e.category === cat.name);
    const totalSpent = categoryExpenses
      .filter(e => e.status === "APPROVED" || e.status === "PAID")
      .reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);
    const pendingAmount = categoryExpenses
      .filter(e => e.status === "PENDING")
      .reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);
    const approvedAmount = categoryExpenses
      .filter(e => e.status === "APPROVED")
      .reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      budgetLimit: parseFloat(cat.budgetLimit || "0"),
      budgetPeriod: cat.budgetPeriod || "MONTHLY",
      totalSpent,
      pendingAmount,
      approvedAmount,
    };
  });
}

export async function getExpenseReportData(filters: {
  startDate: string;
  endDate: string;
}) {
  const ctx = await getExpenseMember();
  if (!ctx) return null;
  const { session, member } = ctx;

  const ability = await getSessionAbility();


  const isAdmin = ability.can("approve", "hr:expenses");
  const conditions = [
    eq(expenses.orgId, member.orgId),
    gte(expenses.expenseDate, filters.startDate),
    lte(expenses.expenseDate, filters.endDate),
  ];

  if (!isAdmin) {
    conditions.push(eq(expenses.userId, session.user.id));
  }

  const allExpenses = await db.query.expenses.findMany({
    where: and(...conditions),
    with: {
      user: true,
    },
    orderBy: [desc(expenses.expenseDate)],
  });
  const totalAmount = allExpenses.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);
  const approvedAmount = allExpenses
    .filter(e => e.status === "APPROVED" || e.status === "PAID")
    .reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);
  const rejectedAmount = allExpenses
    .filter(e => e.status === "REJECTED")
    .reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);
  const pendingAmount = allExpenses
    .filter(e => e.status === "PENDING")
    .reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);
  const categoryMap = new Map<string, { count: number; amount: number }>();
  allExpenses.forEach(e => {
    const existing = categoryMap.get(e.category) || { count: 0, amount: 0 };
    categoryMap.set(e.category, {
      count: existing.count + 1,
      amount: existing.amount + parseFloat(e.amount || "0"),
    });
  });
  const byCategory = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      count: data.count,
      amount: data.amount,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
  const employeeMap = new Map<string, { name: string; count: number; amount: number }>();
  allExpenses.forEach(e => {
    const existing = employeeMap.get(e.userId) || {
      name: `${e.user?.firstName || ""} ${e.user?.lastName || ""}`.trim() || "Unknown",
      count: 0,
      amount: 0,
    };
    employeeMap.set(e.userId, {
      name: existing.name,
      count: existing.count + 1,
      amount: existing.amount + parseFloat(e.amount || "0"),
    });
  });
  const byEmployee = Array.from(employeeMap.entries())
    .map(([userId, data]) => ({
      userId,
      userName: data.name,
      count: data.count,
      amount: data.amount,
    }))
    .sort((a, b) => b.amount - a.amount);
  const monthMap = new Map<string, { count: number; amount: number }>();
  allExpenses.forEach(e => {
    const date = new Date(e.expenseDate);
    const monthKey = `${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`;
    const existing = monthMap.get(monthKey) || { count: 0, amount: 0 };
    monthMap.set(monthKey, {
      count: existing.count + 1,
      amount: existing.amount + parseFloat(e.amount || "0"),
    });
  });
  const byMonth = Array.from(monthMap.entries())
    .map(([month, data]) => ({
      month,
      count: data.count,
      amount: data.amount,
    }))
    .slice(-6);
  const topExpenses = allExpenses
    .filter(e => e.status === "APPROVED" || e.status === "PAID")
    .sort((a, b) => parseFloat(b.amount || "0") - parseFloat(a.amount || "0"))
    .slice(0, 10)
    .map(e => ({
      id: e.id,
      category: e.category,
      amount: parseFloat(e.amount || "0"),
      description: e.description || "",
      userName: `${e.user?.firstName || ""} ${e.user?.lastName || ""}`.trim() || "Unknown",
      expenseDate: e.expenseDate,
    }));

  return {
    summary: {
      totalExpenses: allExpenses.length,
      totalAmount,
      approvedAmount,
      rejectedAmount,
      pendingAmount,
      avgExpenseAmount: allExpenses.length > 0 ? totalAmount / allExpenses.length : 0,
    },
    byCategory,
    byEmployee,
    byMonth,
    topExpenses,
  };
}
