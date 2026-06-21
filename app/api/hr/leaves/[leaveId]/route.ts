import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, leaveBalances, leaveTypes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionAbility } from "@/lib/abilities-server";
import { z } from "zod";
import { LEAVE_POLICY } from "@/lib/leave-policy";
import type { NextRequest } from "next/server";

const updateLeaveSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "PENDING"]),
  rejectionReason: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ leaveId: string }> }
) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (!ability.can("approve", "hr:leaves")) {
      return err("Only admins can approve or reject leave requests.", 403);
    }

    const { leaveId: id } = await params;
    const requestId = Number(id);
    if (isNaN(requestId)) return err("Invalid leave request ID.", 400);

    const body = await parseBody(req, updateLeaveSchema);

    const existing = await db.query.leaveRequests.findFirst({
      where: and(
        eq(leaveRequests.id, requestId),
        eq(leaveRequests.orgId, session.orgId),
      ),
    });

    if (!existing) return err("Leave request not found.", 404);

    await db.transaction(async (tx) => {
      await tx
        .update(leaveRequests)
        .set({
          status: body.status,
          approverId: body.status !== "PENDING" ? session.user.id : existing.approverId,
          rejectionReason: body.status === "REJECTED" ? (body.rejectionReason ?? null) : null,
        })
        .where(eq(leaveRequests.id, requestId));

      if (body.status === "PENDING" && existing.status === "APPROVED" && existing.leaveTypeId) {
        const leaveType = await tx.query.leaveTypes.findFirst({
          where: eq(leaveTypes.id, existing.leaveTypeId),
          columns: { name: true },
        });

        if (leaveType?.name !== LEAVE_POLICY.UNPAID.name) {
          const start = new Date(existing.startDate);
          const end = new Date(existing.endDate);
          let diffDays = existing.isHalfDay ? 0.5 : 0;
          if (!existing.isHalfDay) {
            const cursor = new Date(start);
            while (cursor <= end) {
              const day = cursor.getDay();
              if (day !== 0 && day !== 6) diffDays++;
              cursor.setDate(cursor.getDate() + 1);
            }
          }

          const balanceRecord = await tx.query.leaveBalances.findFirst({
            where: and(
              eq(leaveBalances.userId, existing.userId),
              eq(leaveBalances.leaveTypeId, existing.leaveTypeId),
              eq(leaveBalances.year, new Date().getFullYear()),
            ),
          });

          if (balanceRecord) {
            const prevLopDays = Number(existing.lopDays ?? 0);
            const paidDays = diffDays - prevLopDays;
            const restored = Number(balanceRecord.balance) + paidDays;
            await tx.update(leaveBalances)
              .set({ balance: restored.toString() })
              .where(eq(leaveBalances.id, balanceRecord.id));
            await tx.update(leaveRequests)
              .set({ lopDays: "0" })
              .where(eq(leaveRequests.id, requestId));
          }
        }
      }
    });

    return ok({ success: true });
  });
}
