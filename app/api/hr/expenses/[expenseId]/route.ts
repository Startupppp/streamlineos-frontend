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
    try {
      await createAuditLog({
        action: auditAction,
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(expenseId),
        targetType: "expense",
        metadata: { status: body.status, rejectionReason: body.rejectionReason },
      });
    } catch { /* non-critical */ }

    // Send email to the expense owner
    try {
      const expenseRow = await db.query.expenses.findFirst({
        where: eq(expenses.id, expenseId),
        columns: { userId: true, category: true, amount: true },
      });

      if (expenseRow?.userId) {
        const employee = await db.query.users.findFirst({
          where: eq(users.id, expenseRow.userId),
          columns: { email: true, name: true },
        });

        if (employee?.email) {
          const approverName = session.user.name ?? "Admin";
          const amount = expenseRow.amount ?? "0";
          const category = expenseRow.category ?? "Expense";

          if (body.status === "APPROVED") 
            await sendExpenseApprovedEmail(employee.email, employee.name ?? "Employee", category, amount, approverName);
           else if (body.status === "REJECTED") 
            await sendExpenseRejectedEmail(employee.email, employee.name ?? "Employee", category, amount, approverName, body.rejectionReason ?? "No reason provided");
          else if (body.status === "PAID") 
            await sendExpensePaidEmail(employee.email, employee.name ?? "Employee", category, amount);
          
        }
      }
    } catch { /* email failure non-blocking */ }

    return ok({ success: true });
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  return withAuth(async (session) => {
    const { expenseId: id } = await params;
    const expenseId = Number(id);
    if (isNaN(expenseId)) return err("Invalid expense ID.", 400);

    const expense = await db.query.expenses.findFirst({
      where: and(eq(expenses.id, expenseId), eq(expenses.orgId, session.orgId)),
      columns: { id: true, userId: true, status: true },
    });

    if (!expense) return err("Expense not found.", 404);

    const isOwner = expense.userId === session.user.id;
    const isAdmin = isAdminOrOwner(session.user.role);

    if (!isOwner && !isAdmin) return err("Not authorized to delete this expense.", 403);
    if (expense.status === "PAID") return err("Paid expenses cannot be deleted.", 400);

    await db.delete(expenses).where(and(eq(expenses.id, expenseId), eq(expenses.orgId, session.orgId)));

    void createAuditLog({
      action: "expense.deleted",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(expenseId),
      targetType: "expense",
    }).catch(() => {});

    return ok({ success: true });
  });
}
