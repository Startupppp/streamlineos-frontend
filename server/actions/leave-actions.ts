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
import { sendLeaveRequestEmail, sendLeaveStatusUpdateEmail } from "@/lib/email";
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

  for (const type of types) {
    const existing = await db.query.leaveBalances.findFirst({
      where: and(
        eq(leaveBalances.userId, userId),
        eq(leaveBalances.orgId, orgId),
        eq(leaveBalances.leaveTypeId, type.id),
        eq(leaveBalances.year, targetYear),
      ),
    });

    if (existing) continue;

    const balance = resolveInitialBalance(
      type.name,
      type.daysPerYear,
      joinDate,
      targetYear,
    );

    await db.insert(leaveBalances).values({
      orgId,
      userId,
      leaveTypeId: type.id,
      year: targetYear,
      balance: balance.toString(),
    });
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

  for (const { orgId } of orgs) {
    const casualType = await db.query.leaveTypes.findFirst({
      where: and(
        eq(leaveTypes.orgId, orgId),
        eq(leaveTypes.name, LEAVE_POLICY.CASUAL.name),
      ),
    });

    if (!casualType) continue;
    const balances = await db.query.leaveBalances.findMany({
      where: and(
        eq(leaveBalances.orgId, orgId),
        eq(leaveBalances.leaveTypeId, casualType.id),
        eq(leaveBalances.year, prevMonthYear),
      ),
    });

    for (const bal of balances) {
      if (Number(bal.balance) <= 0) continue;
      const usedLeaves = await db
        .select({ count: sql<number>`count(*)` })
        .from(leaveRequests)
        .where(
          and(
            eq(leaveRequests.userId, bal.userId),
            eq(leaveRequests.leaveTypeId, casualType.id),
            eq(leaveRequests.status, "APPROVED"),
            gte(leaveRequests.startDate, monthStartStr),
            lte(leaveRequests.endDate, monthEndStr),
          ),
        );

      const count = Number(usedLeaves[0]?.count ?? 0);

      if (count === 0) {
        const newBalance = Math.max(0, Number(bal.balance) - LEAVE_POLICY.CASUAL.perMonth);
        await db
          .update(leaveBalances)
          .set({ balance: newBalance.toString() })
          .where(eq(leaveBalances.id, bal.id));
        expiredCount++;
      }
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

    for (const member of members) {
      if (!member.user?.isActive) continue;

      const joiningDate = member.user.joiningDate
        ? new Date(member.user.joiningDate)
        : new Date();

      for (const type of types) {
        const existing = await db.query.leaveBalances.findFirst({
          where: and(
            eq(leaveBalances.userId, member.userId),
            eq(leaveBalances.orgId, orgId),
            eq(leaveBalances.leaveTypeId, type.id),
            eq(leaveBalances.year, newYear),
          ),
        });

        if (existing) continue;
        const balance = resolveInitialBalance(type.name, type.daysPerYear, joiningDate, newYear);

        await db.insert(leaveBalances).values({
          orgId,
          userId: member.userId,
          leaveTypeId: type.id,
          year: newYear,
          balance: balance.toString(),
        });
        resetCount++;
      }
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

  return { success: true, balances, types: filteredTypes };
}

export async function getApprovers() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });
  if (!member) return [];

  const targetRoles: ("ADMIN" | "OWNER")[] = member.role === "ADMIN" ? ["OWNER"] : ["ADMIN", "OWNER"];

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
  approverId: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });
  if (!member) return { error: "No organization found" };

  if (data.startDate > data.endDate) return { error: "Invalid date range" };

  try {
    await db.insert(leaveRequests).values({
      orgId: member.orgId,
      userId: session.user.id,
      leaveTypeId: data.leaveTypeId,
      startDate: data.startDate.toISOString(),
      endDate: data.endDate.toISOString(),
      reason: data.reason,
      approverId: data.approverId,
      status: "PENDING",
    });

    const [approver, leaveType] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, data.approverId) }),
      db.query.leaveTypes.findFirst({ where: eq(leaveTypes.id, data.leaveTypeId) }),
    ]);

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

    revalidatePath("/hr/leaves");
    return { success: true };
  } catch {
    return { error: "Failed to submit request" };
  }
}

export async function processLeaveRequest(data: {
  requestId: number;
  status: "APPROVED" | "REJECTED";
  rejectionReason?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const request = await db.query.leaveRequests.findFirst({
    where: eq(leaveRequests.id, data.requestId),
  });
  if (!request) return { error: "Request not found" };

  if (request.approverId !== session.user.id) {
    const member = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, session.user.id),
    });
    if (request.orgId !== member?.orgId || member.role !== "OWNER") {
      return { error: "Not authorized to process this request" };
    }
  }

  try {
    await db.transaction(async (tx) => {
      const updated = await tx
        .update(leaveRequests)
        .set({
          status: data.status,
          rejectionReason: data.rejectionReason,
        })
        .where(
          and(
            eq(leaveRequests.id, data.requestId),
            eq(leaveRequests.status, "PENDING")
          )
        )
        .returning({ id: leaveRequests.id });
      if (updated.length === 0) {
        throw new Error("Leave request has already been processed");
      }

      if (data.status === "APPROVED" && request.leaveTypeId) {
        const leaveType = await tx.query.leaveTypes.findFirst({
          where: eq(leaveTypes.id, request.leaveTypeId),
          columns: { name: true },
        });
        if (leaveType?.name !== LEAVE_POLICY.UNPAID.name) {
          const start = new Date(request.startDate);
          const end = new Date(request.endDate);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

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

    if (employee?.email) {
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

    revalidatePath("/hr/leaves");
    return { success: true };
  } catch {
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

  return await db.query.leaveRequests.findMany({
    where: and(
      eq(leaveRequests.approverId, session.user.id),
      eq(leaveRequests.orgId, member.orgId),
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
