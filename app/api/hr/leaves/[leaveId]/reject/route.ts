import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, leaveTypes, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { writeAuditLog } from "@/lib/db/audit";
import { createNotification } from "@/server/actions/create-notification";
import { sendLeaveStatusUpdateEmail } from "@/lib/email";
import { EXPENSE_ADMIN_ROLES } from "@/lib/constants/roles";
import { z } from "zod";
import type { NextRequest } from "next/server";

const bodySchema = z.object({
  reason: z.string().optional(),
  comment: z.string().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ leaveId: string }> },
) {
  return withAuth(async (session) => {
    const { leaveId: id } = await params;
    const leaveId = Number(id);
    if (isNaN(leaveId)) return err("Invalid leave request ID.", 400);

    const isAuthorized =
      EXPENSE_ADMIN_ROLES.includes(session.user.role ?? "") ||
      session.user.role === "ADMIN";
    if (!isAuthorized) {
      return err("Only HR, Admin, or CEO can reject leave requests.", 403);
    }

    let reason: string | undefined;
    let comment: string | undefined;
    try {
      const raw = await req.json() as unknown;
      const parsed = bodySchema.safeParse(raw);
      if (!parsed.success) return err("Invalid input", 400);
      reason = parsed.data.reason;
      comment = parsed.data.comment;
    } catch {
      return err("Invalid request body.", 400);
    }

    const existing = await db.query.leaveRequests.findFirst({
      where: and(
        eq(leaveRequests.id, leaveId),
        eq(leaveRequests.orgId, session.orgId),
      ),
    });
    if (!existing) return err("Leave request not found.", 404);
    if (existing.status !== "PENDING") {
      return err(`Cannot reject a request with status: ${existing.status}.`, 400);
    }
    if (existing.userId === session.user.id) {
      return err("You cannot reject your own leave request.", 403);
    }

    await db
      .update(leaveRequests)
      .set({
        status: "REJECTED",
        approverId: session.user.id,
        rejectionReason: reason ?? null,
        managerComment: comment ?? null,
      })
      .where(eq(leaveRequests.id, leaveId));

    const [employee, leaveType] = await Promise.all([
      db.query.users.findFirst({
        where: eq(users.id, existing.userId),
        columns: { email: true, name: true },
      }),
      existing.leaveTypeId
        ? db.query.leaveTypes.findFirst({
            where: eq(leaveTypes.id, existing.leaveTypeId),
            columns: { name: true },
          })
        : Promise.resolve(null),
    ]);

    await Promise.all([
      createNotification({
        orgId: session.orgId,
        userId: existing.userId,
        type: "ERROR",
        title: "Leave Rejected",
        message: `Your leave request has been rejected.${reason ? ` Reason: ${reason}` : ""}${comment ? ` — "${comment}"` : ""}`,
        link: "/hr/leaves",
      }),
      writeAuditLog({
        action: "hr.leave_rejected",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(leaveId),
        targetType: "leave_request",
        metadata: { reason, comment },
      }),
      employee?.email
        ? sendLeaveStatusUpdateEmail(
            employee.email,
            employee.name ?? "Employee",
            leaveType?.name ?? "Leave",
            existing.startDate,
            existing.endDate,
            "REJECTED",
            session.user.name ?? "HR",
            reason ?? ""
          ).catch(() => undefined)
        : Promise.resolve(),
    ]);

    return ok({ success: true });
  });
}
