"use server";

import { db } from "@/lib/db";
import { expenses, expenseCategories, organizationMembers } from "@/lib/db/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { createAuditLog } from "@/lib/audit-log";
import { ensureOrgMembership } from "@/lib/auth-helpers";

/** Get authenticated member, auto-creating org membership if needed */
async function getExpenseMember() {
  const session = await auth();
  if (!session?.user?.id) return null;
  await ensureOrgMembership(session.user.id, session.user.role);
  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });
  if (!member) return null;
  return { session, member };
}

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

    revalidatePath("/hr/expenses");
    return { success: true, expense };
  } catch (error) {
    logger.error("Failed to create expense", error);
    return { error: "Failed to create expense" };
  }
}

export async function getExpenses(filters?: {
  userId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  categoryId?: number;
}) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member) return [];

  const isAdmin = member.role === "CEO" || member.role === "ADMIN";

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
  const session = await auth();
  if (!session?.user?.id) return [];

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member) return [];

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
  const session = await auth();
  if (!session?.user?.id) return [];

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member || (member.role !== "CEO" && member.role !== "ADMIN")) {
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

export async function approveExpense(expenseId: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member || (member.role !== "CEO" && member.role !== "ADMIN")) {
    return { error: "Permission denied" };
  }

  try {
    await db.update(expenses)
      .set({
        status: "APPROVED",
        approverId: session.user.id,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(expenses.id, expenseId),
        eq(expenses.orgId, member.orgId),
        eq(expenses.status, "PENDING")
      ));

    await createAuditLog({
      action: "expense.approved",
      userId: session.user.id,
      orgId: member.orgId,
      targetId: String(expenseId),
      targetType: "expense",
    });

    revalidatePath("/hr/expenses");
    return { success: true };
  } catch (error) {
    logger.error("Failed to approve expense", error);
    return { error: "Failed to approve expense" };
  }
}

export async function rejectExpense(expenseId: number, reason: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member || (member.role !== "CEO" && member.role !== "ADMIN")) {
    return { error: "Permission denied" };
  }

  try {
    await db.update(expenses)
      .set({
        status: "REJECTED",
        approverId: session.user.id,
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(and(
        eq(expenses.id, expenseId),
        eq(expenses.orgId, member.orgId),
        eq(expenses.status, "PENDING")
      ));

    await createAuditLog({
      action: "expense.rejected",
      userId: session.user.id,
      orgId: member.orgId,
      targetId: String(expenseId),
      targetType: "expense",
      metadata: { reason },
    });

    revalidatePath("/hr/expenses");
    return { success: true };
  } catch (error) {
    logger.error("Failed to reject expense", error);
    return { error: "Failed to reject expense" };
  }
}

export async function markExpenseAsPaid(expenseId: number, transactionRef?: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member || (member.role !== "CEO" && member.role !== "ADMIN")) {
    return { error: "Permission denied" };
  }

  try {
    await db.update(expenses)
      .set({
        status: "PAID",
        paidAt: new Date(),
        transactionRef,
        updatedAt: new Date(),
      })
      .where(and(
        eq(expenses.id, expenseId),
        eq(expenses.orgId, member.orgId),
        eq(expenses.status, "APPROVED")
      ));

    revalidatePath("/hr/expenses");
    return { success: true };
  } catch (error) {
    logger.error("Failed to mark expense as paid", error);
    return { error: "Failed to mark expense as paid" };
  }
}

export async function deleteExpense(expenseId: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member) return { error: "Permission denied" };

  const expense = await db.query.expenses.findFirst({
    where: and(
      eq(expenses.id, expenseId),
      eq(expenses.orgId, member.orgId)
    ),
  });

  if (!expense) return { error: "Expense not found" };

  const isOwner = expense.userId === session.user.id;
  const isAdmin = member.role === "CEO" || member.role === "ADMIN";
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
  const session = await auth();
  if (!session?.user?.id) return [];

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member) return [];

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
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member || (member.role !== "CEO" && member.role !== "ADMIN")) {
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
  const session = await auth();
  if (!session?.user?.id) return null;

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member) return null;

  const isAdmin = member.role === "CEO" || member.role === "ADMIN";
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

  if (!member || (member.role !== "CEO" && member.role !== "ADMIN")) {
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
  const session = await auth();
  if (!session?.user?.id) return null;

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member) return null;

  const isAdmin = member.role === "CEO" || member.role === "ADMIN";
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

