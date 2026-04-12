import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { z } from "zod";
import type { NextRequest } from "next/server";

const updateLeaveSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectionReason: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ leaveId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can approve or reject leave requests.", 403);
    }

    const { leaveId: id } = await params;
    const requestId = Number(id);
    if (isNaN(requestId)) return err("Invalid leave request ID.", 400);

    const body = await parseBody(req, updateLeaveSchema);

    if (!body.status || !["APPROVED", "REJECTED"].includes(body.status)) {
      return err("status must be APPROVED or REJECTED.", 400);
    }

    const existing = await db.query.leaveRequests.findFirst({
      where: and(
        eq(leaveRequests.id, requestId),
        eq(leaveRequests.orgId, session.orgId)
      ),
    });

    if (!existing) return err("Leave request not found.", 404);

    await db
      .update(leaveRequests)
      .set({
        status: body.status,
        approverId: session.user.id,
        rejectionReason: body.rejectionReason ?? null,
      })
      .where(eq(leaveRequests.id, requestId));

    return ok({ success: true });
  });
}
