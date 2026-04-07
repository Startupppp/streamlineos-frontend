"use server";

import { db } from "@/lib/db";
import {
  leaveRequests,
  leaveTypes,
  leaveBalances,
  organizationMembers,
  users,
} from "@/lib/db/schema";
import { eq, and, desc, sql, inArray, lte, gte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { sendLeaveRequestEmail, sendLeaveStatusUpdateEmail } from "@/lib/email";
import { createAuditLog } from "@/lib/audit-log";
import { createNotification, notifyAllMembers, notifyByRoles } from "../create-notification";
import { ROLES, EXPENSE_ADMIN_ROLES } from "@/lib/constants/roles";
import { LEAVE_POLICY } from "@/lib/leave-policy";

export async function getApprovers() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });
  if (!member) return [];

  const targetRoles: string[] = member.role === ROLES.CEO
    ? [ROLES.HR, ROLES.ADMIN]
    : member.role === ROLES.HR
    ? [ROLES.CEO, ROLES.ADMIN]
    : [ROLES.ADMIN, ROLES.HR, ROLES.CEO];

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
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });
  if (!member) return { error: "No organization found" };

  if (data.startDate > data.endDate) return { error: "Invalid date range" };

  // Reject leave requests that start before the employee's Date of Joining
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
    });

    const leaveType = await db.query.leaveTypes.findFirst({ where: eq(leaveTypes.id, data.leaveTypeId) });

    if (isCeo) {
      // CEO auto-approved: deduct balance immediately
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

      // Also notify all HR and CEO users about the leave request
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

export async function processLeaveRequest(data: {
  requestId: number;
  status: "APPROVED" | "REJECTED" | "PENDING";
  rejectionReason?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const request = await db.query.leaveRequests.findFirst({
    where: eq(leaveRequests.id, data.requestId),
  });
  if (!request) return { error: "Request not found" };

  if (request.userId === session.user.id) {
    return { error: "You cannot approve or reject your own leave request" };
  }

  if (request.approverId !== session.user.id) {
    const member = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, session.user.id),
    });
    if (!member || request.orgId !== member.orgId || !EXPENSE_ADMIN_ROLES.includes(member.role)) {
      return { error: "Not authorized to process this request" };
    }
  }

  try {
    await db.transaction(async (tx) => {
      const updated = await tx
        .update(leaveRequests)
        .set({
          status: data.status,
          rejectionReason: data.status === "REJECTED" ? data.rejectionReason : null,
        })
        .where(eq(leaveRequests.id, data.requestId))
        .returning({ id: leaveRequests.id });
      if (updated.length === 0) {
        throw new Error("Leave request not found");
      }

      // If reverting from APPROVED back to PENDING, restore the leave balance
      if (data.status === "PENDING" && request.status === "APPROVED" && request.leaveTypeId) {
        const leaveType = await tx.query.leaveTypes.findFirst({
          where: eq(leaveTypes.id, request.leaveTypeId),
          columns: { name: true },
        });
        if (leaveType?.name !== LEAVE_POLICY.UNPAID.name) {
          const start = new Date(request.startDate);
          const end = new Date(request.endDate);
          let diffDays = 0;
          const cursor = new Date(start);
          while (cursor <= end) {
            const day = cursor.getDay();
            if (day !== 0 && day !== 6) diffDays++;
            cursor.setDate(cursor.getDate() + 1);
          }
          const balanceRecord = await tx.query.leaveBalances.findFirst({
            where: and(
              eq(leaveBalances.userId, request.userId),
              eq(leaveBalances.leaveTypeId, request.leaveTypeId),
              eq(leaveBalances.year, new Date().getFullYear()),
            ),
          });
          if (balanceRecord) {
            const restored = Number(balanceRecord.balance) + diffDays;
            await tx.update(leaveBalances).set({ balance: restored.toString() }).where(eq(leaveBalances.id, balanceRecord.id));
          }
        }
      }

      if (data.status === "APPROVED" && request.leaveTypeId) {
        const leaveType = await tx.query.leaveTypes.findFirst({
          where: eq(leaveTypes.id, request.leaveTypeId),
          columns: { name: true },
        });
        if (leaveType?.name !== LEAVE_POLICY.UNPAID.name) {
          const start = new Date(request.startDate);
          const end = new Date(request.endDate);
          let diffDays = 0;
          const cursor = new Date(start);
          while (cursor <= end) {
            const day = cursor.getDay();
            if (day !== 0 && day !== 6) diffDays++;
            cursor.setDate(cursor.getDate() + 1);
          }

          const balanceRecord = await tx.query.leaveBalances.findFirst({
            where: and(
              eq(leaveBalances.userId, request.userId),
              eq(leaveBalances.leaveTypeId, request.leaveTypeId),
              eq(leaveBalances.year, new Date().getFullYear()),
            ),
          });

          if (balanceRecord) {
            const newBal = Number(balanceRecord.balance) - diffDays;
            if (newBal < 0) {
              throw new Error(
                `Insufficient leave balance. Available: ${balanceRecord.balance}, Required: ${diffDays}`,
              );
            }
            await tx
              .update(leaveBalances)
              .set({ balance: newBal.toString() })
              .where(eq(leaveBalances.id, balanceRecord.id));
          }
        }
      }
    });

    const [employee, leaveType, approver] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, request.userId) }),
      db.query.leaveTypes.findFirst({ where: eq(leaveTypes.id, request.leaveTypeId!) }),
      db.query.users.findFirst({ where: eq(users.id, session.user.id) }),
    ]);

    if (employee?.email && (data.status === "APPROVED" || data.status === "REJECTED")) {
      await sendLeaveStatusUpdateEmail(
        employee.email,
        employee.name || "Employee",
        leaveType?.name || "Leave",
        new Date(request.startDate).toLocaleDateString(),
        new Date(request.endDate).toLocaleDateString(),
        data.status,
        approver?.name || "Manager",
        data.rejectionReason,
      );
    }

    const notifTitle = data.status === "PENDING"
      ? "Leave Reverted to Pending"
      : `Leave ${data.status === "APPROVED" ? "Approved" : "Rejected"}`;
    const notifType = data.status === "APPROVED" ? "SUCCESS" : data.status === "REJECTED" ? "ERROR" : "INFO";

    await createNotification({
      orgId: request.orgId,
      userId: request.userId,
      type: notifType,
      title: notifTitle,
      message: `Your leave request has been ${data.status === "APPROVED" ? "approved" : "rejected"} by ${approver?.name || "a manager"}.${data.rejectionReason ? ` Reason: ${data.rejectionReason}` : ""}`,
      link: "/hr/leaves",
    });
    if (data.status === "APPROVED" && employee) {
      await notifyAllMembers(request.orgId, {
        type: "INFO",
        title: "Team Member on Leave",
        message: `${employee.name || "A team member"} will be on ${leaveType?.name || "leave"} from ${new Date(request.startDate).toLocaleDateString()} to ${new Date(request.endDate).toLocaleDateString()}.`,
        link: "/hr/leaves",
        excludeUserId: request.userId,
      });
    }

    await createAuditLog({
      action: data.status === "APPROVED" ? "hr.leave_approved" : "hr.leave_rejected",
      userId: session.user.id,
      orgId: request.orgId,
      targetId: String(data.requestId),
      targetType: "leave_request",
      metadata: { status: data.status, rejectionReason: data.rejectionReason },
    });

    revalidatePath("/hr/leaves");
    return { success: true };
  } catch (error) {
    logger.error("Failed to process leave request", error);
    return { error: "Failed to process request" };
  }
}

export async function getMyRequests() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });
  if (!member) return [];

  return await db.query.leaveRequests.findMany({
    where: and(
      eq(leaveRequests.userId, session.user.id),
      eq(leaveRequests.orgId, member.orgId)
    ),
    with: {
      leaveType: true,
      approver: true,
    },
    orderBy: [desc(leaveRequests.createdAt)],
  });
}

export async function getIncomingRequests() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });
  if (!member) return [];

  const isAdminRole = EXPENSE_ADMIN_ROLES.includes(member.role);

  return await db.query.leaveRequests.findMany({
    where: and(
      // HR/CEO/Admin see all pending requests in the org, others see only their assigned ones
      ...(isAdminRole
        ? [eq(leaveRequests.orgId, member.orgId)]
        : [eq(leaveRequests.approverId, session.user.id), eq(leaveRequests.orgId, member.orgId)]
      ),
      eq(leaveRequests.status, "PENDING"),
    ),
    with: {
      user: true,
      leaveType: true,
    },
    orderBy: [desc(leaveRequests.createdAt)],
  });
}

export async function getPendingApprovalCount() {
  const session = await auth();
  if (!session?.user?.id) return 0;

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });
  if (!member) return 0;

  const count = await db
    .select({ count: sql<number>`count(*)` })
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.approverId, session.user.id),
        eq(leaveRequests.orgId, member.orgId),
        eq(leaveRequests.status, "PENDING"),
      ),
    );

  return Number(count[0]?.count || 0);
}

export async function getAllIncomingRequests() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });
  if (!member) return [];

  const isAdminRole = EXPENSE_ADMIN_ROLES.includes(member.role);

  return await db.query.leaveRequests.findMany({
    where: and(
      ...(isAdminRole
        ? [eq(leaveRequests.orgId, member.orgId)]
        : [eq(leaveRequests.approverId, session.user.id), eq(leaveRequests.orgId, member.orgId)]
      ),
    ),
    with: {
      user: true,
      leaveType: true,
      approver: true,
    },
    orderBy: [desc(leaveRequests.createdAt)],
  });
}

export async function getApprovedLeavesThisWeek() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });
  if (!member) return [];

  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return await db.query.leaveRequests.findMany({
    where: and(
      eq(leaveRequests.orgId, member.orgId),
      eq(leaveRequests.status, "APPROVED"),
      lte(leaveRequests.startDate, weekEnd.toISOString()),
      gte(leaveRequests.endDate, weekStart.toISOString()),
    ),
    with: {
      user: true,
      leaveType: true,
    },
    orderBy: [desc(leaveRequests.startDate)],
  });
}
