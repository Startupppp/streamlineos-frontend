import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getLeaves } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { leaveRequests, leaveBalances, leaveTypes } from "@/lib/db/schema";
import { eq, and, lte, gte } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";
import { LEAVE_POLICY } from "@/lib/leave-policy";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createLeaveSchema = z.object({
  typeId: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    const data = await getLeaves(session.orgId, session.user.id);
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const body = await parseBody(req, createLeaveSchema);

      if (!body.typeId || !body.startDate || !body.endDate) {
        return err("typeId, startDate, and endDate are required.", 400);
      }

      if (body.startDate > body.endDate) {
        return err("Start date must be before or equal to end date.", 400);
      }

      const diffDays =
        Math.round(
          Math.abs(
            new Date(body.endDate).getTime() -
              new Date(body.startDate).getTime()
          ) /
            (1000 * 60 * 60 * 24)
        ) + 1;

      const [balance, leaveType] = await Promise.all([
        db.query.leaveBalances.findFirst({
          where: and(
            eq(leaveBalances.userId, session.user.id),
            eq(leaveBalances.orgId, session.orgId),
            eq(leaveBalances.leaveTypeId, body.typeId),
            eq(leaveBalances.year, new Date().getFullYear())
          ),
        }),
        db.query.leaveTypes.findFirst({
          where: eq(leaveTypes.id, body.typeId),
          columns: { name: true },
        }),
      ]);

      const isUnpaid = leaveType?.name === LEAVE_POLICY.UNPAID.name;
      if (!isUnpaid && balance && Number(balance.balance) < diffDays) {
        return err(
          `Insufficient leave balance. Available: ${balance.balance}, Required: ${diffDays}`,
          400
        );
      }

      const overlapping = await db.query.leaveRequests.findFirst({
        where: and(
          eq(leaveRequests.userId, session.user.id),
          eq(leaveRequests.orgId, session.orgId),
          lte(leaveRequests.startDate, formatDateOnly(new Date(body.endDate))),
          gte(leaveRequests.startDate, formatDateOnly(new Date(body.startDate)))
        ),
      });

      if (overlapping && overlapping.status !== "REJECTED") {
        return err(
          "You already have a leave request for overlapping dates.",
          400
        );
      }

      await db.insert(leaveRequests).values({
        orgId: session.orgId,
        userId: session.user.id,
        leaveTypeId: body.typeId,
        startDate: formatDateOnly(new Date(body.startDate)),
        endDate: formatDateOnly(new Date(body.endDate)),
        reason: body.reason,
        status: "PENDING",
      });

      return ok({ success: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Request failed";
      return err(message, 400);
    }
  });
}
