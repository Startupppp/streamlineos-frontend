import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { writeAuditLog } from "@/lib/db/audit";
import type { NextRequest } from "next/server";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ leaveId: string }> },
) {
  return withAuth(async (session) => {
    const { leaveId: id } = await params;
    const leaveId = Number(id);
    if (isNaN(leaveId)) return err("Invalid leave request ID.", 400);

    const existing = await db.query.leaveRequests.findFirst({
      where: and(
        eq(leaveRequests.id, leaveId),
        eq(leaveRequests.orgId, session.orgId),
      ),
    });
    if (!existing) return err("Leave request not found.", 404);

    // Only the requesting employee can cancel their own pending request
    if (existing.userId !== session.user.id) {
      return err("You can only cancel your own leave requests.", 403);
    }
    if (existing.status !== "PENDING") {
      return err("Only pending leave requests can be cancelled.", 400);
    }

    await db
      .update(leaveRequests)
      .set({ status: "CANCELLED" })
      .where(eq(leaveRequests.id, leaveId));

    await writeAuditLog({
      action: "hr.leave_cancelled",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(leaveId),
      targetType: "leave_request",
    });

    return ok({ success: true });
  });
}
