"use server";

import { db } from "@/lib/db";
import {
  leaveRequests,
  leaveTypes,
  leaveBalances,
  organizationMembers,
  users,
} from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { sendLeaveRequestEmail } from "@/lib/email";
import { createNotification, notifyAllMembers, notifyByRoles } from "../create-notification";
import { ROLES, EXPENSE_ADMIN_ROLES } from "@/lib/constants/roles";

export async function getApprovers() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });
  if (!member) return [];

  const targetRoles: string[] = member.role === ROLES.CEO
    ? [ROLES.HR]
    : member.role === ROLES.HR
    ? [ROLES.CEO]
    : [ROLES.HR, ROLES.CEO];

  const approvers = await db.query.organizationMembers.findMany({
    where: and(
      eq(organizationMembers.orgId, member.orgId),
      inArray(organizationMembers.role, targetRoles),
    ),
    with: { user: true },
  });

  return approvers
    .filter((m) => m.userId !== session.user.id)
    .map((m) => m.user);
}

export async function submitLeaveRequest(data: {
  leaveTypeId: number;
  startDate: Date;
  endDate: Date;
  reason: string;
  priority?: string;
  approverId: string;
  attachmentUrl?: string;
  isHalfDay?: boolean;
  halfDayPeriod?: "AM" | "PM";
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });
  if (!member) return { error: "No organization found" };

  if (data.startDate > data.endDate) return { error: "Invalid date range" };

  const userRecord = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { joiningDate: true },
  });
  if (userRecord?.joiningDate) {
    const doj = new Date(userRecord.joiningDate);
    if (data.startDate < doj) {
      return { error: "Leave dates cannot be before your Date of Joining" };
    }
  }

  const isCeo = member.role === ROLES.CEO;

  try {
    const validPriorities = new Set(["LOW", "MEDIUM", "HIGH"]);
    const priority = data.priority && validPriorities.has(data.priority) ? data.priority : "MEDIUM";

    await db.insert(leaveRequests).values({
      orgId: member.orgId,
      userId: session.user.id,
      leaveTypeId: data.leaveTypeId,
      startDate: data.startDate.toISOString(),
      endDate: data.endDate.toISOString(),
      reason: data.reason,
      priority,
      approverId: isCeo ? session.user.id : data.approverId,
      attachmentUrl: data.attachmentUrl || null,
      status: isCeo ? "APPROVED" : "PENDING",
      isHalfDay: data.isHalfDay ?? false,
      halfDayPeriod: data.isHalfDay ? (data.halfDayPeriod ?? "AM") : null,
    });

    const leaveType = await db.query.leaveTypes.findFirst({ where: eq(leaveTypes.id, data.leaveTypeId) });

    if (isCeo) {

      if (leaveType?.name !== "Unpaid Leave") {
        const start = data.startDate;
        const end = data.endDate;
        let diffDays = 0;
        const cursor = new Date(start);
        while (cursor <= end) {
          const day = cursor.getDay();
          if (day !== 0 && day !== 6) diffDays++;
          cursor.setDate(cursor.getDate() + 1);
        }

        const balanceRecord = await db.query.leaveBalances.findFirst({
          where: and(
            eq(leaveBalances.userId, session.user.id),
            eq(leaveBalances.leaveTypeId, data.leaveTypeId),
            eq(leaveBalances.year, new Date().getFullYear()),
          ),
        });

        if (balanceRecord) {
          const newBal = Number(balanceRecord.balance) - diffDays;
          if (newBal < 0) {
            return { error: `Insufficient leave balance. Available: ${balanceRecord.balance}, Required: ${diffDays}` };
          }
          await db
            .update(leaveBalances)
            .set({ balance: newBal.toString() })
            .where(eq(leaveBalances.id, balanceRecord.id));
        }
      }

      await notifyAllMembers(member.orgId, {
        type: "INFO",
        title: "Team Member on Leave",
        message: `${session.user.name || "CEO"} will be on ${leaveType?.name || "leave"} from ${data.startDate.toLocaleDateString()} to ${data.endDate.toLocaleDateString()}.`,
        link: "/hr/leaves",
        excludeUserId: session.user.id,
      });
    } else {
      const approver = await db.query.users.findFirst({ where: eq(users.id, data.approverId) });

      if (approver?.email) {
        await sendLeaveRequestEmail(
          approver.email,
          approver.name || "Approver",
          session.user.name || "Employee",
          leaveType?.name || "Leave",
          data.startDate.toLocaleDateString(),
          data.endDate.toLocaleDateString(),
          data.reason,
        );
      }

      await createNotification({
        orgId: member.orgId,
        userId: data.approverId,
        type: "WARNING",
        title: "Leave Request Pending",
        message: `${session.user.name || "An employee"} has requested ${leaveType?.name || "leave"} from ${data.startDate.toLocaleDateString()} to ${data.endDate.toLocaleDateString()}.`,
        link: "/hr/leaves",
        metadata: { leaveType: leaveType?.name, reason: data.reason },
      });

      await notifyByRoles(member.orgId, [ROLES.CEO, ROLES.HR], {
        type: "INFO",
        title: "New Leave Request",
        message: `${session.user.name || "An employee"} has requested ${leaveType?.name || "leave"} from ${data.startDate.toLocaleDateString()} to ${data.endDate.toLocaleDateString()}.`,
        link: "/hr/leaves",
        excludeUserId: session.user.id,
      });
    }

    revalidatePath("/hr/leaves");
    return { success: true };
  } catch (error) {
    logger.error("Failed to submit leave request", error);
    return { error: "Failed to submit request" };
  }
}
