import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { expenses, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { createAuditLog } from "@/lib/audit-log";
import { sendExpenseApprovedEmail, sendExpenseRejectedEmail, sendExpensePaidEmail } from "@/lib/email";

const updateExpenseSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "PAID"]),
  rejectionReason: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can update expense status.", 403);
    }

    const { expenseId: id } = await params;
    const expenseId = Number(id);
    if (isNaN(expenseId)) return err("Invalid expense ID.", 400);

    const body = await parseBody(req, updateExpenseSchema);

    if (!body.status || !["APPROVED", "REJECTED", "PAID"].includes(body.status)) {
      return err("status must be APPROVED, REJECTED, or PAID.", 400);
    }

    await db.transaction(async (tx) => {
      const [expense] = await tx
        .select()
        .from(expenses)
        .where(
          and(
            eq(expenses.id, expenseId),
            eq(expenses.orgId, session.orgId)
          )
        )
        .for("update");

      if (!expense) throw new Error("Expense not found");
      if (expense.status !== "PENDING") throw new Error("Expense has already been processed");

      await tx
        .update(expenses)
        .set({
          status: body.status,
          approverId: session.user.id,
          rejectionReason: body.rejectionReason ?? null,
        })
        .where(eq(expenses.id, expenseId));
    });

    const auditAction = body.status === "APPROVED" ? "expense.approved" : body.status === "PAID" ? "expense.paid" : "expense.rejected";
    void createAuditLog({
      action: auditAction,
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(expenseId),
      targetType: "expense",
      metadata: { status: body.status, rejectionReason: body.rejectionReason },
    }).catch(() => {});

    // Send email to the expense owner (non-blocking)
    void (async () => {
      const expenseRow = await db.query.expenses.findFirst({
        where: eq(expenses.id, expenseId),
        columns: { userId: true, category: true, amount: true },
      });
      if (!expenseRow?.userId) return;

      const employee = await db.query.users.findFirst({
        where: eq(users.id, expenseRow.userId),
        columns: { email: true, name: true },
      });
      if (!employee?.email) return;

      const approverName = session.user.name ?? "Admin";
      const amount = expenseRow.amount ?? "0";
      const category = expenseRow.category ?? "Expense";

      if (body.status === "APPROVED") {
        await sendExpenseApprovedEmail(employee.email, employee.name ?? "Employee", category, amount, approverName);
      } else if (body.status === "REJECTED") {
        await sendExpenseRejectedEmail(employee.email, employee.name ?? "Employee", category, amount, approverName, body.rejectionReason ?? "No reason provided");
      } else if (body.status === "PAID") {
        await sendExpensePaidEmail(employee.email, employee.name ?? "Employee", category, amount);
      }
    })().catch(() => {});

    return ok({ success: true });
  });
}
