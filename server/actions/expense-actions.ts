"use server";

import { db } from "@/lib/db";
import { expenses, expenseCategories, organizationMembers } from "@/lib/db/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member) return { error: "Not a member of any organization" };

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
    console.error("Failed to create expense:", error);
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

  const isAdmin = member.role === "OWNER" || member.role === "ADMIN";

  const conditions = [eq(expenses.orgId, member.orgId)];

  if (!isAdmin) {
    conditions.push(eq(expenses.userId, session.user.id));
  } else if (filters?.userId) {
    conditions.push(eq(expenses.userId, filters.userId));
  }

  if (filters?.status && filters.status !== "all") {
    conditions.push(eq(expenses.status, filters.status as "PENDING" | "APPROVED" | "REJECTED" | "PAID"));
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

  if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
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

  if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
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
        eq(expenses.orgId, member.orgId)
      ));

    revalidatePath("/hr/expenses");
    return { success: true };
  } catch (error) {
    console.error("Failed to approve expense:", error);
    return { error: "Failed to approve expense" };
  }
}

export async function rejectExpense(expenseId: number, reason: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
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
        eq(expenses.orgId, member.orgId)
      ));

    revalidatePath("/hr/expenses");
    return { success: true };
  } catch (error) {
    console.error("Failed to reject expense:", error);
    return { error: "Failed to reject expense" };
  }
}

export async function markExpenseAsPaid(expenseId: number, transactionRef?: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
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
    console.error("Failed to mark expense as paid:", error);
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
  const isAdmin = member.role === "OWNER" || member.role === "ADMIN";
  const isPending = expense.status === "PENDING";

  if (!isAdmin && (!isOwner || !isPending)) {
    return { error: "Permission denied" };
  }

  try {
    await db.delete(expenses).where(eq(expenses.id, expenseId));
    revalidatePath("/hr/expenses");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete expense:", error);
    return { error: "Failed to delete expense" };
  }
}

// Expense Categories
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

  if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
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
    console.error("Failed to create expense category:", error);
    return { error: "Failed to create category" };
  }
}

// Statistics
export async function getExpenseStats() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member) return null;

  const isAdmin = member.role === "OWNER" || member.role === "ADMIN";
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

