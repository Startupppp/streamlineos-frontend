"use server";

import { db } from "@/lib/db";
import {
  leaveRequests,
  leaveTypes,
  leaveBalances,
  organizationMembers,
} from "@/lib/db/schema";
import { eq, and, sql, gte, lte, inArray } from "drizzle-orm";
import {
  DEFAULT_LEAVE_TYPES,
  LEAVE_POLICY,
  resolveInitialBalance,
} from "@/lib/leave-policy";

export async function ensureLeaveTypes(orgId: string) {
  let types = await db.query.leaveTypes.findMany({
    where: eq(leaveTypes.orgId, orgId),
  });

  if (types.length === 0) {

    for (const t of DEFAULT_LEAVE_TYPES) {
      await db.insert(leaveTypes).values({
        orgId,
        name: t.name,
        daysPerYear: t.daysPerYear,
        carryForward: t.carryForward,
      });
    }
  } else {

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

export async function expireUnusedMonthlyCasualLeaves() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevMonthYear = now.getMonth() === 0 ? currentYear - 1 : currentYear;
  const monthStart = new Date(prevMonthYear, prevMonth, 1);
  const monthEnd = new Date(prevMonthYear, prevMonth + 1, 0);

  const monthStartStr = monthStart.toISOString().split("T")[0];
  const monthEndStr = monthEnd.toISOString().split("T")[0];

  let expiredCount = 0;

  const casualTypes = await db.query.leaveTypes.findMany({
    where: eq(leaveTypes.name, LEAVE_POLICY.CASUAL.name),
  });

  if (casualTypes.length === 0) return { expiredCount: 0 };

  const orgCasualMap = new Map(casualTypes.map((ct) => [ct.orgId, ct]));
  const casualTypeIds = casualTypes.map((ct) => ct.id);

  const allBalances = await db.query.leaveBalances.findMany({
    where: and(
      inArray(leaveBalances.leaveTypeId, casualTypeIds),
      eq(leaveBalances.year, prevMonthYear),
    ),
  });

  const positiveBalances = allBalances.filter((b) => Number(b.balance) > 0);
  if (positiveBalances.length === 0) return { expiredCount: 0 };

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

    const existingBalances = await db.query.leaveBalances.findMany({
      where: and(
        eq(leaveBalances.orgId, orgId),
        eq(leaveBalances.year, newYear),
      ),
    });
    const existingSet = new Set(
      existingBalances.map((b) => `${b.userId}:${b.leaveTypeId}`)
    );

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

