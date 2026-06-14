"server-only";

import { db } from "@/lib/db";
import {
  attendance,
  leaveRequests,
  leaveBalances,
  leaveTypes,
  wfhRequests,
  holidays,
  users,
} from "@/lib/db/schema";
import { eq, and, desc, gte, lte, asc } from "drizzle-orm";
import { formatDateOnly, getTodayString } from "@/lib/date-utils";
import type {
  AttendanceLog,
  AttendanceStatusResult,
  LeavesResult,
  LeaveBalance,
  WfhRequest,
  Holiday,
} from "@/types/hr";
import type { LeaveType, LeaveRequest } from "@/types/hr";

export async function getAttendanceStatus(
  orgId: string,
  userId: string
): Promise<AttendanceStatusResult> {
  const today = getTodayString();
  const now = new Date();

  const todayLogs = await db.query.attendance.findMany({
    where: and(
      eq(attendance.userId, userId),
      eq(attendance.date, today),
      eq(attendance.orgId, orgId)
    ),
  });

  let dailyWorkHours = 0;
  let dailyBreakHours = 0;
  let isDailyOvertime = false;

  for (const log of todayLogs) {
    dailyBreakHours += Number(log.breakHours || 0);

    if (!log.checkOut && log.checkIn) {
      const start = new Date(log.checkIn);
      const durationMs = now.getTime() - start.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      const netWork = durationHours - (Number(log.breakHours) || 0);
      dailyWorkHours += Math.max(0, netWork);
    } else {
      const rawWork = Number(log.workHours || 0);
      const breakHrs = Number(log.breakHours || 0);
      dailyWorkHours += Math.max(0, rawWork - breakHrs);
    }

    if (log.isOvertime) isDailyOvertime = true;
  }

  const todayLog = await db.query.attendance.findFirst({
    where: and(
      eq(attendance.userId, userId),
      eq(attendance.date, today),
      eq(attendance.orgId, orgId)
    ),
    orderBy: [desc(attendance.createdAt)],
  });

  let status: "OFFLINE" | "PRESENT" | "ON_BREAK" | "CHECKED_OUT" = "OFFLINE";
  if (todayLog) {
    if (todayLog.checkOut) status = "CHECKED_OUT";
    else if (todayLog.status === "ON_BREAK") status = "ON_BREAK";
    else status = "PRESENT";
  }

  const logs = await db.query.attendance.findMany({
    where: and(eq(attendance.userId, userId), eq(attendance.orgId, orgId)),
    orderBy: [desc(attendance.createdAt)],
    limit: 10,
  });

  let cooldownRemaining = 0;
  if (status === "CHECKED_OUT" && todayLog?.checkOut) {
    const lastCheckOut = new Date(todayLog.checkOut);
    const diffMs = now.getTime() - lastCheckOut.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    if (diffMinutes < 2) {
      cooldownRemaining = Math.ceil((2 * 60 * 1000 - diffMs) / 1000);
    }
  }

  return {
    status,
    logs: logs as unknown as AttendanceLog[],
    todayLog: todayLog as unknown as AttendanceLog | null,
    dailyStats: {
      workHours: dailyWorkHours.toFixed(2),
      breakHours: dailyBreakHours.toFixed(2),
      isOvertime: isDailyOvertime,
    },
    cooldownRemaining,
  };
}

export async function getAttendanceLogs(
  orgId: string,
  userId: string,
  year?: number,
  month?: number
): Promise<AttendanceLog[]> {
  if (year !== undefined && month !== undefined) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    return db.query.attendance.findMany({
      where: and(
        eq(attendance.userId, userId),
        eq(attendance.orgId, orgId),
        gte(attendance.date, formatDateOnly(startDate)),
        lte(attendance.date, formatDateOnly(endDate))
      ),
      orderBy: [asc(attendance.date)],
    }) as unknown as Promise<AttendanceLog[]>;
  }

  return db.query.attendance.findMany({
    where: and(eq(attendance.userId, userId), eq(attendance.orgId, orgId)),
    orderBy: [desc(attendance.createdAt)],
    limit: 30,
  }) as unknown as Promise<AttendanceLog[]>;
}

export async function getMonthlyAttendance(
  orgId: string,
  userId: string,
  year: number,
  month: number
): Promise<AttendanceLog[]> {
  const mm = String(month + 1).padStart(2, "0");
  const startDate = `${year}-${mm}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;

  return db.query.attendance.findMany({
    where: and(
      eq(attendance.userId, userId),
      eq(attendance.orgId, orgId),
      gte(attendance.date, startDate),
      lte(attendance.date, endDate)
    ),
    orderBy: [asc(attendance.date)],
  }) as unknown as Promise<AttendanceLog[]>;
}

export async function getLeaves(orgId: string, userId: string): Promise<LeavesResult> {
  const [balances, types, requests] = await Promise.all([
    db.query.leaveBalances.findMany({
      where: and(
        eq(leaveBalances.userId, userId),
        eq(leaveBalances.orgId, orgId)
      ),
    }),
    db.query.leaveTypes.findMany({
      where: eq(leaveTypes.orgId, orgId),
    }),
    db.query.leaveRequests.findMany({
      where: and(
        eq(leaveRequests.userId, userId),
        eq(leaveRequests.orgId, orgId)
      ),
      orderBy: [desc(leaveRequests.createdAt)],
    }),
  ]);

  return {
    balances: balances as unknown as LeaveBalance[],
    types: types as unknown as LeaveType[],
    requests: requests as unknown as LeaveRequest[],
  };
}

export async function getLeaveBalance(orgId: string, userId: string): Promise<LeaveBalance[]> {
  return db.query.leaveBalances.findMany({
    where: and(
      eq(leaveBalances.userId, userId),
      eq(leaveBalances.orgId, orgId),
      eq(leaveBalances.year, new Date().getFullYear())
    ),
  }) as unknown as Promise<LeaveBalance[]>;
}

export async function getWfhRequests(orgId: string, userId: string): Promise<WfhRequest[]> {
  return db.query.wfhRequests.findMany({
    where: and(eq(wfhRequests.orgId, orgId), eq(wfhRequests.userId, userId)),
    orderBy: [desc(wfhRequests.createdAt)],
  }) as unknown as Promise<WfhRequest[]>;
}

export async function getPendingWfhRequests(orgId: string): Promise<WfhRequest[]> {
  const rows = await db
    .select({
      id: wfhRequests.id,
      orgId: wfhRequests.orgId,
      userId: wfhRequests.userId,
      date: wfhRequests.date,
      reason: wfhRequests.reason,
      status: wfhRequests.status,
      approverId: wfhRequests.approverId,
      rejectionReason: wfhRequests.rejectionReason,
      createdAt: wfhRequests.createdAt,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userEmail: users.email,
      userImage: users.image,
    })
    .from(wfhRequests)
    .innerJoin(users, eq(wfhRequests.userId, users.id))
    .where(and(eq(wfhRequests.orgId, orgId), eq(wfhRequests.status, "PENDING")))
    .orderBy(desc(wfhRequests.createdAt));

  return rows.map((r) => ({
    id: r.id,
    orgId: r.orgId,
    userId: r.userId,
    date: r.date,
    reason: r.reason,
    status: r.status,
    approverId: r.approverId,
    rejectionReason: r.rejectionReason,
    createdAt: r.createdAt,
    user: { id: r.userId, firstName: r.userFirstName, lastName: r.userLastName, email: r.userEmail, image: r.userImage },
  })) as WfhRequest[];
}

export async function getHolidays(orgId: string, year: number): Promise<Holiday[]> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  return db.query.holidays.findMany({
    where: and(
      eq(holidays.orgId, orgId),
      gte(holidays.date, startDate),
      lte(holidays.date, endDate)
    ),
    orderBy: [asc(holidays.date)],
  }) as unknown as Promise<Holiday[]>;
}

export async function getHolidaysForCalendar(
  orgId: string,
  year: number,
  month: number
): Promise<Holiday[]> {
  const mm = String(month).padStart(2, "0");
  const startDate = `${year}-${mm}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;

  return db.query.holidays.findMany({
    where: and(
      eq(holidays.orgId, orgId),
      gte(holidays.date, startDate),
      lte(holidays.date, endDate)
    ),
    orderBy: [asc(holidays.date)],
  }) as unknown as Promise<Holiday[]>;
}
