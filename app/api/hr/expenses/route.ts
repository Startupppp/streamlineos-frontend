import { withAuth, ok, err, parseBody, parseQuery } from "@/lib/api/helpers";
import { cached, invalidateCachePattern, CACHE_TTL } from "@/lib/cache";
import { getExpenses } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { expenses, users, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionAbility } from "@/lib/abilities-server";
import { formatDateOnly } from "@/lib/date-utils";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { createAuditLog } from "@/lib/audit-log";
import { sendExpenseSubmittedEmail } from "@/lib/email";

const listExpensesSchema = z.object({
  userId: z.string().min(1).optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "PAID"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const createExpenseSchema = z.object({
  category: z.string(),
  categoryId: z.number().int().optional(),
  amount: z.number().positive("Amount must be greater than 0").max(999_999_999.99, "Amount cannot exceed 999,999,999.99"),
  description: z.string().optional(),
  receiptUrl: z.string().optional(),
  receiptFileName: z.string().optional(),
  merchant: z.string().optional(),
  paymentMethod: z.string().optional(),
  projectId: z.number().int().optional(),
  expenseDate: z.string(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { userId: filterUserId, status, page, limit, startDate, endDate } = parseQuery(req, listExpensesSchema);
    const ability = await getSessionAbility();

    const isAdmin = ability.can("approve", "hr:expenses");

    const key = `hr:expenses:${session.orgId}:${session.user.id}:${isAdmin ? "admin" : "self"}:${filterUserId ?? ""}:${status ?? ""}:${page ?? ""}:${limit ?? ""}:${startDate ?? ""}:${endDate ?? ""}`;
    const data = await cached(
      key,
      () =>
        getExpenses(session.orgId, session.user.id, isAdmin, {
          filterUserId,
          status,
          page,
          limit,
          startDate,
          endDate,
        }),
      { ttlSeconds: CACHE_TTL.SHORT },
    );

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createExpenseSchema);

    if (!body.category || body.amount === undefined || !body.expenseDate) {
      return err("category, amount, and expenseDate are required.", 400);
    }

    const ability = await getSessionAbility();


    const isAdminRole = ability.can("approve", "hr:expenses");

    const [expense] = await db
      .insert(expenses)
      .values({
        orgId: session.orgId,
        userId: session.user.id,
        category: body.category,
        categoryId: body.categoryId,
        amount: body.amount.toString(),
        description: body.description,
        receiptUrl: body.receiptUrl,
        receiptFileName: body.receiptFileName,
        merchant: body.merchant,
        paymentMethod: body.paymentMethod,
        projectId: body.projectId,
        expenseDate: formatDateOnly(body.expenseDate),
        status: isAdminRole ? "APPROVED" : "PENDING",
        approverId: isAdminRole ? session.user.id : null,
        approvedAt: isAdminRole ? new Date() : null,
      })
      .returning();

    try {
      await createAuditLog({
        action: "expense.created",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(expense.id),
        targetType: "expense",
        metadata: { category: body.category, amount: body.amount },
      });
    } catch {  }

    if (!isAdminRole) {
      void import("@/lib/services/automation/engine").then(({ runAutomationsForEvent }) =>
        runAutomationsForEvent(session.orgId, "expense.submitted", {
          expenseId: expense.id,
          userId: session.user.id,
          employeeName: session.user.name ?? "",
          amount: body.amount.toString(),
          category: body.category,
          submittedAt: new Date().toISOString(),
        })
      );
    }

    try {
      if (!isAdminRole) {
        const hrMembers = await db
          .select({ userId: organizationMembers.userId })
          .from(organizationMembers)
          .where(and(eq(organizationMembers.orgId, session.orgId), eq(organizationMembers.role, "HR")));

        for (const m of hrMembers) {
          const hrUser = await db.query.users.findFirst({
            where: eq(users.id, m.userId),
            columns: { email: true, name: true },
          });
          if (hrUser?.email) {
            await sendExpenseSubmittedEmail(
              hrUser.email,
              hrUser.name ?? "HR",
              session.user.name ?? "Employee",
              body.category,
              body.amount.toString(),
              body.description ?? ""
            );
          }
        }
      }
    } catch {  }

    await invalidateCachePattern(`hr:expenses:${session.orgId}:*`);

    return ok(expense, 201);
  });
}
