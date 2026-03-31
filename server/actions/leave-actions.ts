"use server";

import { db } from "@/lib/db";
import {
  leaveRequests,
  leaveTypes,
  leaveBalances,
  organizationMembers,
  users,
} from "@/lib/db/schema";
import { eq, and, desc, sql, gte, lte, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { sendLeaveRequestEmail, sendLeaveStatusUpdateEmail } from "@/lib/email";
import { createAuditLog } from "@/lib/audit-log";
import { createNotification, notifyAllMembers, notifyByRoles } from "./create-notification";
import {
  DEFAULT_LEAVE_TYPES,
  LEAVE_POLICY,
  ALLOWED_LEAVE_TYPE_NAMES,
  resolveInitialBalance,
} from "@/lib/leave-policy";
async function ensureLeaveTypes(orgId: string) {
  let types = await db.query.leaveTypes.findMany({
    where: eq(leaveTypes.orgId, orgId),
  });

  if (types.length === 0) {
    // First-time seed: insert all default types
    for (const t of DEFAULT_LEAVE_TYPES) {
      await db.insert(leaveTypes).values({
        orgId,
        name: t.name,
        daysPerYear: t.daysPerYear,
        carryForward: t.carryForward,
      });
    }
  } else {
    // Backfill any missing default types (e.g. Unpaid Leave)
    const existingNames = new Set(types.map((t) => t.name));
    for (const t of DEFAULT_LEAVE_TYPES) {
      if (!existingNames.has(t.name)) {
        await db.insert(leaveTypes).values({
          orgId,
          name: t.name,
          daysPerYear: t.daysPerYear,
          carryForward: t.carryForward,
        });
      }
    }
  }

  types = await db.query.leaveTypes.findMany({
    where: eq(leaveTypes.orgId, orgId),
  });

  return types;
}

async function ensureUserBalances(
  orgId: string,
  userId: string,
  types: { id: number; name: string; daysPerYear: number }[],
) {
  const year = new Date().getFullYear();

  const existing = await db.query.leaveBalances.findMany({
    where: and(
      eq(leaveBalances.userId, userId),
      eq(leaveBalances.orgId, orgId),
      eq(leaveBalances.year, year),
    ),
  });

  const existingTypeIds = new Set(existing.map((b) => b.leaveTypeId));
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { joiningDate: true },
  });
  const joiningDate = user?.joiningDate ? new Date(user.joiningDate) : new Date();

  for (const t of types) {
    if (existingTypeIds.has(t.id)) continue;

    const balance = resolveInitialBalance(t.name, t.daysPerYear, joiningDate, year);

    await db.insert(leaveBalances).values({
      orgId,
      userId,
      leaveTypeId: t.id,
      year,
      balance: balance.toString(),
    });
  }
}

export async function initializeLeaveBalances(
  orgId: string,
  userId: string,
  joiningDate: Date | string,
) {
  const types = await ensureLeaveTypes(orgId);
  const joinDate = typeof joiningDate === "string" ? new Date(joiningDate) : joiningDate;
  const currentYear = new Date().getFullYear();
  const targetYear = Math.max(joinDate.getFullYear(), currentYear);

  // Batch: fetch all existing balances for this user+year in one query
  const existingBalances = await db.query.leaveBalances.findMany({
    where: and(
      eq(leaveBalances.userId, userId),
      eq(leaveBalances.orgId, orgId),
      eq(leaveBalances.year, targetYear),
    ),
  });
  const existingTypeIds = new Set(existingBalances.map((b) => b.leaveTypeId));

  const toInsert = types
    .filter((type) => !existingTypeIds.has(type.id))
    .map((type) => ({
      orgId,
      userId,
      leaveTypeId: type.id,
      year: targetYear,
      balance: resolveInitialBalance(type.name, type.daysPerYear, joinDate, targetYear).toString(),
    }));

  if (toInsert.length > 0) {
    try {
      await db.insert(leaveBalances).values(toInsert);
    } catch (err) {
      // If bulk insert fails (e.g., race condition), insert one-by-one
      for (const row of toInsert) {
        try {
          await db.insert(leaveBalances).values(row);
        } catch {
          // Skip duplicates silently
        }
      }
    }
  }
}

export async function expireUnusedMonthlyCasualLeaves() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevMonthYear = now.getMonth() === 0 ? currentYear - 1 : currentYear;
  const monthStart = new Date(prevMonthYear, prevMonth, 1);
  const monthEnd = new Date(prevMonthYear, prevMonth + 1, 0);

  const monthStartStr = monthStart.toISOString().split("T")[0];
  const monthEndStr = monthEnd.toISOString().split("T")[0];
  const orgs = await db
    .selectDistinct({ orgId: leaveBalances.orgId })
    .from(leaveBalances)
    .where(eq(leaveBalances.year, prevMonthYear));

  let expiredCount = 0;

  // Batch: fetch all casual leave types across orgs in one query
  const casualTypes = await db.query.leaveTypes.findMany({
    where: eq(leaveTypes.name, LEAVE_POLICY.CASUAL.name),
  });

  if (casualTypes.length === 0) return { expiredCount: 0 };

  const orgCasualMap = new Map(casualTypes.map((ct) => [ct.orgId, ct]));
  const casualTypeIds = casualTypes.map((ct) => ct.id);

  // Batch: fetch all balances for casual leave types at once
  const allBalances = await db.query.leaveBalances.findMany({
    where: and(
      inArray(leaveBalances.leaveTypeId, casualTypeIds),
      eq(leaveBalances.year, prevMonthYear),
    ),
  });

  const positiveBalances = allBalances.filter((b) => Number(b.balance) > 0);
  if (positiveBalances.length === 0) return { expiredCount: 0 };

  // Batch: find all users who used casual leave in prev month
  const usedLeaveResults = await db
    .select({
      userId: leaveRequests.userId,
      leaveTypeId: leaveRequests.leaveTypeId,
      count: sql<number>`count(*)`,
    })
    .from(leaveRequests)
    .where(
      and(
        inArray(leaveRequests.leaveTypeId, casualTypeIds),
        eq(leaveRequests.status, "APPROVED"),
        gte(leaveRequests.startDate, monthStartStr!),
        lte(leaveRequests.endDate, monthEndStr!),
      ),
    )
    .groupBy(leaveRequests.userId, leaveRequests.leaveTypeId);

  const usedSet = new Set(usedLeaveResults.map((r) => `${r.userId}:${r.leaveTypeId}`));

  for (const bal of positiveBalances) {
    const casualType = orgCasualMap.get(bal.orgId);
    if (!casualType || bal.leaveTypeId !== casualType.id) continue;

    if (!usedSet.has(`${bal.userId}:${bal.leaveTypeId}`)) {
      const newBalance = Math.max(0, Number(bal.balance) - LEAVE_POLICY.CASUAL.perMonth);
      await db
        .update(leaveBalances)
        .set({ balance: newBalance.toString() })
        .where(eq(leaveBalances.id, bal.id));
      expiredCount++;
    }
  }

  return { expiredCount };
}

export async function resetYearlyLeaveBalances() {
  const newYear = new Date().getFullYear();

  const orgs = await db
    .selectDistinct({ orgId: leaveTypes.orgId })
    .from(leaveTypes);

  let resetCount = 0;

  for (const { orgId } of orgs) {
    const types = await ensureLeaveTypes(orgId);
    const members = await db.query.organizationMembers.findMany({
      where: eq(organizationMembers.orgId, orgId),
      with: { user: { columns: { id: true, joiningDate: true, isActive: true } } },
    });

    const activeMembers = members.filter((m) => m.user?.isActive);
    if (activeMembers.length === 0 || types.length === 0) continue;

    // Batch: fetch ALL existing balances for this org+year in one query
    const existingBalances = await db.query.leaveBalances.findMany({
      where: and(
        eq(leaveBalances.orgId, orgId),
        eq(leaveBalances.year, newYear),
      ),
    });
    const existingSet = new Set(
      existingBalances.map((b) => `${b.userId}:${b.leaveTypeId}`)
    );

    // Build batch insert
    const toInsert: typeof leaveBalances.$inferInsert[] = [];
    for (const member of activeMembers) {
      const joiningDate = member.user?.joiningDate
        ? new Date(member.user.joiningDate)
        : new Date();

      for (const type of types) {
        if (existingSet.has(`${member.userId}:${type.id}`)) continue;
        const balance = resolveInitialBalance(type.name, type.daysPerYear, joiningDate, newYear);
        toInsert.push({
          orgId,
          userId: member.userId,
          leaveTypeId: type.id,
          year: newYear,
          balance: balance.toString(),
        });
      }
    }

    if (toInsert.length > 0) {
      await db.insert(leaveBalances).values(toInsert).onConflictDoNothing();
      resetCount += toInsert.length;
    }
  }

  return { resetCount };
}

export async function getLeaveContext() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });
  if (!member) return { error: "No organization found" };

  const types = await ensureLeaveTypes(member.orgId);
  const allowedTypes = types.filter((t) => ALLOWED_LEAVE_TYPE_NAMES.has(t.name));
  const seenTypeNames = new Set<string>();
  const filteredTypes = allowedTypes.filter((t) => {
    if (seenTypeNames.has(t.name)) return false;
    seenTypeNames.add(t.name);
    return true;
  });
  await ensureUserBalances(member.orgId, session.user.id, filteredTypes);

  // Fetch user's joining date for date picker restrictions
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { joiningDate: true },
  });
  const joiningDate = user?.joiningDate ? new Date(user.joiningDate).toISOString() : null;

  const rawBalances = await db
    .select({
      id: leaveBalances.id,
      leaveTypeId: leaveBalances.leaveTypeId,
      balance: leaveBalances.balance,
      typeName: leaveTypes.name,
      daysPerYear: leaveTypes.daysPerYear,
    })
    .from(leaveBalances)
    .leftJoin(leaveTypes, eq(leaveBalances.leaveTypeId, leaveTypes.id))
    .where(
      and(
        eq(leaveBalances.userId, session.user.id),
        eq(leaveBalances.year, new Date().getFullYear()),
      ),
    );

  const allowedBalances = rawBalances.filter((b) => b.typeName && ALLOWED_LEAVE_TYPE_NAMES.has(b.typeName));
  const seenNames = new Set<string>();
  const balances = allowedBalances.filter((b) => {
    if (!b.typeName || seenNames.has(b.typeName)) return false;
    seenNames.add(b.typeName);
    return true;
  });

  return { success: true, balances, types: filteredTypes, joiningDate };
}

export async function getApprovers() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });
  if (!member) return [];

  const targetRoles: string[] = member.role === "CEO"
    ? ["HR", "ADMIN"]
    : member.role === "HR"
    ? ["CEO", "ADMIN"]
    : ["ADMIN", "HR", "CEO"];

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

  const isCeo = member.role === "CEO";

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
      await notifyByRoles(member.orgId, ["CEO", "HR"], {
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
    if (!member || request.orgId !== member.orgId || (member.role !== "CEO" && member.role !== "HR" && member.role !== "ADMIN")) {
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

  const isAdminRole = member.role === "CEO" || member.role === "HR" || member.role === "ADMIN";

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

  const isAdminRole = member.role === "CEO" || member.role === "HR" || member.role === "ADMIN";

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
