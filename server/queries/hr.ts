"server-only";

import { db } from "@/lib/db";
import {
  departments,
  organizationMembers,
  attendance,
  leaveRequests,
  leaveBalances,
  leaveTypes,
  payrolls,
  salaryStructures,
  expenses,
  assets,
  documents,
  performanceReviews,
  goals,
  helpdeskTickets,
  users,
  holidays,
  wfhRequests,
  employeeDevices,
} from "@/lib/db/schema";
import { timesheets, projectMembers, projects, tickets } from "@/lib/db/schema/projects";
import { incentives, incentiveConfig } from "@/lib/db/schema/crm";
import { eq, and, desc, gte, lte, asc, isNull, sql, ilike, or, count } from "drizzle-orm";
import { formatDateOnly, getTodayString } from "@/lib/date-utils";
import { branchIdFilter, type BranchContext } from "@/lib/db/branch-filter";
import type {
  Department,
  Employee,
  AttendanceLog,
  AttendanceStatusResult,
  LeavesResult,
  LeaveBalance,
  Payroll,
  PayrollWithUser,
  SalaryStructure,
  Expense,
  Asset,
  Document,
  PerformanceReview,
  Goal,
  HelpdeskTicket,
  EmployeeStats,
  EmployeePayslip,
  WfhRequest,
  Holiday,
  Device,
  Incentive,
  IncentivesResult,
  IncentiveStats,
  IncentiveConfig,
  WorkLog,
  OrgChartNode,
  PaginatedResult,
  PaginatedEmployees,
} from "@/types/hr";

export async function getDepartments(orgId: string): Promise<Department[]> {
  return db.query.departments.findMany({
    where: eq(departments.orgId, orgId),
  }) as Promise<Department[]>;
}

export async function getEmployees(
  orgId: string,
  branch?: BranchContext
): Promise<Employee[]> {
  const members = await db.query.organizationMembers.findMany({
    where: eq(organizationMembers.orgId, orgId),
    with: {
      user: true,
    },
  });

  return members
    .map((m) => m.user)
    .filter((u) => {
      if (u.isActive === false) return false;

      if (branch?.branchId !== null && branch?.branchId !== undefined &&
          ["BRANCH_MANAGER", "BRANCH_HR"].includes(branch.role)) {
        return u.branchId === branch.branchId;
      }
      return true;
    })
    .map((u) => ({
      id: u.id,
      name: u.name,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      designation: u.designation,
      employeeId: u.employeeId,
      departmentId: u.departmentId,
      image: u.image,
      isActive: u.isActive,
      joiningDate: u.joiningDate,
      hasDashboardAccess: u.hasDashboardAccess,
      reportingTo: u.reportingTo,
      monthlySalary: u.monthlySalary,
    }));
}

export async function getEmployeesPaginated(
  orgId: string,
  page: number = 1,
  limit: number = 20,
  search?: string,
  branch?: BranchContext
): Promise<PaginatedEmployees> {
  const offset = (page - 1) * limit;

  const baseConditions = [
    eq(organizationMembers.orgId, orgId),
    eq(users.isActive, true),
  ];

  const branchCond = branchIdFilter(users.branchId, branch ?? { role: "", branchId: null, userId: "" });
  if (branchCond) baseConditions.push(branchCond);

  const searchConditions = search
    ? [
        ...baseConditions,
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(users.employeeId, `%${search}%`)
        ),
      ]
    : baseConditions;

  const [dataResult, countResult] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        designation: users.designation,
        employeeId: users.employeeId,
        departmentId: users.departmentId,
        image: users.image,
        isActive: users.isActive,
        joiningDate: users.joiningDate,
        hasDashboardAccess: users.hasDashboardAccess,
        reportingTo: users.reportingTo,
        monthlySalary: users.monthlySalary,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(and(...searchConditions))
      .orderBy(users.name)
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(and(...searchConditions)),
  ]);

  const total = countResult[0]?.total ?? 0;

  return {
    data: dataResult as Employee[],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getEmployee(orgId: string, userId: string): Promise<Employee | null> {
  const member = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.orgId, orgId),
      eq(organizationMembers.userId, userId)
    ),
    with: { user: true },
  });

  if (!member) return null;
  const u = member.user;
  return {
    id: u.id,
    name: u.name,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    role: u.role,
    designation: u.designation,
    employeeId: u.employeeId,
    departmentId: u.departmentId,
    image: u.image,
    isActive: u.isActive,
    joiningDate: u.joiningDate,
    hasDashboardAccess: u.hasDashboardAccess,
    reportingTo: u.reportingTo,
    monthlySalary: u.monthlySalary,
  };
}

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
    types: types as unknown as import("@/types/hr").LeaveType[],
    requests: requests as unknown as import("@/types/hr").LeaveRequest[],
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

export async function getPayrolls(orgId: string, userId: string): Promise<Payroll[]> {
  return db.query.payrolls.findMany({
    where: and(
      eq(payrolls.userId, userId),
      eq(payrolls.orgId, orgId)
    ),
    orderBy: [desc(payrolls.createdAt)],
  }) as unknown as Promise<Payroll[]>;
}

export async function getSalaryStructures(
  orgId: string,
  userId?: string,
  requestingUserId?: string,
  isAdmin?: boolean
): Promise<SalaryStructure[]> {
  const conditions = [eq(salaryStructures.orgId, orgId)];

  if (userId) {
    conditions.push(eq(salaryStructures.userId, userId));
  } else if (!isAdmin && requestingUserId) {
    conditions.push(eq(salaryStructures.userId, requestingUserId));
  }

  return db.query.salaryStructures.findMany({
    where: and(...conditions),
    orderBy: [desc(salaryStructures.effectiveFrom)],
  }) as unknown as Promise<SalaryStructure[]>;
}

export async function getExpenses(
  orgId: string,
  userId: string,
  isAdmin: boolean,
  params?: {
    filterUserId?: string;
    status?: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }
): Promise<{ data: Expense[]; total: number; page: number; limit: number; totalPages: number }> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions = [eq(expenses.orgId, orgId)];
  if (!isAdmin) {
    conditions.push(eq(expenses.userId, userId));
  } else if (params?.filterUserId) {
    conditions.push(eq(expenses.userId, params.filterUserId));
  }
  if (params?.status) conditions.push(eq(expenses.status, params.status));
  if (params?.startDate) conditions.push(gte(expenses.expenseDate, params.startDate));
  if (params?.endDate) conditions.push(lte(expenses.expenseDate, params.endDate));

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(expenses)
    .where(and(...conditions));

  const total = Number(countResult?.count || 0);

  const data = await db.query.expenses.findMany({
    where: and(...conditions),
    orderBy: [desc(expenses.expenseDate)],
    limit,
    offset,
  });

  return {
    data: data as unknown as Expense[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getAssets(orgId: string): Promise<Asset[]> {
  return db.query.assets.findMany({
    where: eq(assets.orgId, orgId),
    orderBy: [desc(assets.createdAt)],
  }) as unknown as Promise<Asset[]>;
}

export async function getDocuments(
  orgId: string,
  userId: string,
  isAdmin: boolean,
  params?: {
    filterUserId?: string;
    type?: string;
  }
): Promise<Document[]> {
  const conditions = [
    eq(documents.orgId, orgId),
    eq(documents.isActive, true),
  ];

  if (params?.filterUserId) {
    conditions.push(eq(documents.userId, params.filterUserId));
  } else if (!isAdmin) {
    conditions.push(eq(documents.userId, userId));
  }

  if (params?.type) {
    conditions.push(eq(documents.type, params.type as import("@/types/hr").DocumentType));
  }

  return db.query.documents.findMany({
    where: and(...conditions),
    orderBy: [desc(documents.createdAt)],
  }) as unknown as Promise<Document[]>;
}

export async function getPerformanceReviews(
  orgId: string,
  userId: string,
  isAdmin: boolean,
  filterUserId?: string
): Promise<PerformanceReview[]> {
  const conditions = [eq(performanceReviews.orgId, orgId)];

  if (filterUserId) {
    conditions.push(eq(performanceReviews.userId, filterUserId));
  } else if (!isAdmin) {
    conditions.push(eq(performanceReviews.userId, userId));
  }

  return db.query.performanceReviews.findMany({
    where: and(...conditions),
    orderBy: [desc(performanceReviews.periodEnd)],
  }) as unknown as Promise<PerformanceReview[]>;
}

export async function getGoals(
  orgId: string,
  userId: string,
  isAdmin: boolean,
  filterUserId?: string
): Promise<Goal[]> {
  const conditions = [eq(goals.orgId, orgId)];

  if (filterUserId) {
    conditions.push(eq(goals.userId, filterUserId));
  } else if (!isAdmin) {
    conditions.push(eq(goals.userId, userId));
  }

  return db.query.goals.findMany({
    where: and(...conditions),
    orderBy: [desc(goals.createdAt)],
  }) as unknown as Promise<Goal[]>;
}

export async function getWorkLogs(
  orgId: string,
  userId: string,
  year: number,
  quarter: number,
  filterUserId?: string
): Promise<WorkLog[]> {
  const targetUserId = filterUserId || userId;

  const startMonth = (quarter - 1) * 3;
  const startDate = new Date(year, startMonth, 1);
  const endDate = new Date(year, startMonth + 3, 0);
  const startStr = formatDateOnly(startDate);
  const endStr = formatDateOnly(endDate);

  const logs = await db.query.timesheets.findMany({
    where: and(
      eq(timesheets.orgId, orgId),
      eq(timesheets.userId, targetUserId)
    ),
  });

  return logs.filter((l) => l.date >= startStr && l.date <= endStr) as unknown as WorkLog[];
}

export async function getHelpdeskTickets(
  orgId: string,
  userId: string,
  isAdmin: boolean,
  params?: {
    filterUserId?: string;
    status?: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  }
): Promise<HelpdeskTicket[]> {
  const conditions = [eq(helpdeskTickets.orgId, orgId)];

  if (params?.filterUserId) {
    conditions.push(eq(helpdeskTickets.userId, params.filterUserId));
  } else if (!isAdmin) {
    conditions.push(eq(helpdeskTickets.userId, userId));
  }

  if (params?.status) {
    conditions.push(eq(helpdeskTickets.status, params.status));
  }

  return db.query.helpdeskTickets.findMany({
    where: and(...conditions),
    orderBy: [desc(helpdeskTickets.createdAt)],
  }) as unknown as Promise<HelpdeskTicket[]>;
}

export async function getOrgChart(orgId: string): Promise<OrgChartNode[]> {
  const members = await db.query.organizationMembers.findMany({
    where: eq(organizationMembers.orgId, orgId),
    with: { user: true },
  });

  return members
    .map((m) => m.user)
    .filter((u) => u.isActive !== false)
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      designation: u.designation,
      image: u.image,
      departmentId: u.departmentId,
      reportingTo: u.reportingTo,
    }));
}

export async function getEmployeeStats(orgId: string, userId: string): Promise<EmployeeStats> {
  const year = new Date().getFullYear();
  const startOfYear = `${year}-01-01`;
  const endOfYear = `${year}-12-31`;

  const [leaveData, attendanceData] = await Promise.all([
    db.query.leaveRequests.findMany({
      where: and(
        eq(leaveRequests.userId, userId),
        eq(leaveRequests.orgId, orgId),
        gte(leaveRequests.startDate, startOfYear),
        lte(leaveRequests.startDate, endOfYear)
      ),
    }),
    db.query.attendance.findMany({
      where: and(
        eq(attendance.userId, userId),
        eq(attendance.orgId, orgId),
        gte(attendance.date, startOfYear),
        lte(attendance.date, endOfYear)
      ),
    }),
  ]);

  const byType: Record<string, number> = {};
  let approved = 0;
  let pending = 0;
  let rejected = 0;

  for (const lr of leaveData) {
    if (lr.status === "APPROVED") approved++;
    else if (lr.status === "PENDING") pending++;
    else if (lr.status === "REJECTED") rejected++;
    const typeKey = lr.leaveTypeId?.toString() ?? "unknown";
    byType[typeKey] = (byType[typeKey] ?? 0) + 1;
  }

  let totalHours = 0;
  let daysPresent = 0;
  for (const log of attendanceData) {
    if (log.checkIn) {
      daysPresent++;
      totalHours += Number(log.workHours || 0);
    }
  }

  return {
    leaves: {
      total: leaveData.length,
      approved,
      pending,
      rejected,
      byType,
    },
    attendance: daysPresent > 0
      ? {
          daysPresent,
          daysAbsent: 0,
          daysLate: 0,
          totalHours: totalHours.toFixed(2),
          avgHoursPerDay: (totalHours / daysPresent).toFixed(2),
        }
      : null,
  };
}

export async function getEmployeeProjects(orgId: string, userId: string) {
  const memberships = await db
    .select({
      id: projects.id,
      name: projects.name,
      key: projects.key,
      status: projects.status,
      role: projectMembers.role,
    })
    .from(projectMembers)
    .innerJoin(projects, eq(projectMembers.projectId, projects.id))
    .where(and(eq(projectMembers.userId, userId), eq(projects.orgId, orgId)));

  return memberships;
}

export async function getEmployeeTickets(orgId: string, userId: string) {
  const data = await db
    .select({
      id: tickets.id,
      title: tickets.title,
      status: tickets.status,
      priority: tickets.priority,
      projectId: tickets.projectId,
      ticketNumber: tickets.ticketNumber,
    })
    .from(tickets)
    .where(and(eq(tickets.assigneeId, userId), eq(tickets.orgId, orgId)))
    .orderBy(desc(tickets.id))
    .limit(50);

  return { data };
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

export async function getDevices(orgId: string): Promise<Device[]> {
  const rows = await db
    .select({
      id: employeeDevices.id,
      orgId: employeeDevices.orgId,
      userId: employeeDevices.userId,
      deviceType: employeeDevices.deviceType,
      deviceName: employeeDevices.deviceName,
      serialNumber: employeeDevices.serialNumber,
      brand: employeeDevices.brand,
      model: employeeDevices.model,
      assignedDate: employeeDevices.assignedDate,
      returnDate: employeeDevices.returnDate,
      status: employeeDevices.status,
      notes: employeeDevices.notes,
      createdAt: employeeDevices.createdAt,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userEmail: users.email,
    })
    .from(employeeDevices)
    .innerJoin(users, eq(employeeDevices.userId, users.id))
    .where(eq(employeeDevices.orgId, orgId))
    .orderBy(desc(employeeDevices.createdAt));

  return rows.map((r) => ({
    id: r.id,
    orgId: r.orgId,
    userId: r.userId,
    deviceType: r.deviceType,
    deviceName: r.deviceName,
    serialNumber: r.serialNumber,
    brand: r.brand,
    model: r.model,
    assignedDate: r.assignedDate,
    returnDate: r.returnDate,
    status: r.status,
    notes: r.notes,
    createdAt: r.createdAt,
    user: { id: r.userId, firstName: r.userFirstName, lastName: r.userLastName, email: r.userEmail },
  })) as Device[];
}

export async function getIncentives(
  orgId: string,
  params?: { status?: string; page?: number; limit?: number }
): Promise<IncentivesResult> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions = [eq(incentives.orgId, orgId)];
  if (params?.status) {
    conditions.push(eq(incentives.status, params.status as "PENDING" | "APPROVED" | "REJECTED" | "ADDED_TO_PAYROLL"));
  }

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(incentives)
    .where(and(...conditions));

  const total = Number(countResult?.count || 0);

  const rows = await db
    .select({
      id: incentives.id,
      orgId: incentives.orgId,
      salesRepId: incentives.salesRepId,
      clientAccountId: incentives.clientAccountId,
      investmentAmount: incentives.investmentAmount,
      incentiveRate: incentives.incentiveRate,
      calculatedAmount: incentives.calculatedAmount,
      approvedAmount: incentives.approvedAmount,
      status: incentives.status,
      notes: incentives.notes,
      createdAt: incentives.createdAt,
      salesRepName: users.name,
      salesRepImage: users.image,
    })
    .from(incentives)
    .innerJoin(users, eq(incentives.salesRepId, users.id))
    .where(and(...conditions))
    .orderBy(desc(incentives.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    incentives: rows.map((r) => ({
      id: r.id,
      orgId: r.orgId,
      salesRepId: r.salesRepId,
      clientAccountId: r.clientAccountId,
      investmentAmount: r.investmentAmount,
      incentiveRate: r.incentiveRate,
      calculatedAmount: r.calculatedAmount,
      approvedAmount: r.approvedAmount,
      status: r.status,
      notes: r.notes,
      createdAt: r.createdAt,
      salesRep: { id: r.salesRepId, name: r.salesRepName, image: r.salesRepImage },
    })) as Incentive[],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getIncentiveStats(orgId: string): Promise<IncentiveStats> {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [allRows, monthRows] = await Promise.all([
    db.query.incentives.findMany({
      where: eq(incentives.orgId, orgId),
    }),
    db.query.incentives.findMany({
      where: and(
        eq(incentives.orgId, orgId),
        gte(incentives.createdAt, new Date(monthStart))
      ),
    }),
  ]);

  let totalRevenue = 0;
  let approved = 0;
  let pending = 0;
  let thisMonth = 0;

  for (const inc of allRows) {
    const amount = Number(inc.calculatedAmount || 0);
    totalRevenue += amount;
    if (inc.status === "APPROVED" || inc.status === "ADDED_TO_PAYROLL") approved++;
    if (inc.status === "PENDING") pending++;
  }
  for (const inc of monthRows) {
    thisMonth += Number(inc.calculatedAmount || 0);
  }

  return {
    thisMonth: thisMonth.toFixed(2),
    totalRevenue: totalRevenue.toFixed(2),
    avgPerConversion: approved > 0 ? (totalRevenue / approved).toFixed(2) : "0.00",
    pending,
    approved,
  };
}

export async function getIncentiveConfigs(orgId: string): Promise<IncentiveConfig[]> {
  return db.query.incentiveConfig.findMany({
    where: and(eq(incentiveConfig.orgId, orgId), eq(incentiveConfig.isActive, true)),
    orderBy: [desc(incentiveConfig.effectiveFrom)],
  }) as unknown as Promise<IncentiveConfig[]>;
}

export async function getAllPayrolls(orgId: string, month: string): Promise<PayrollWithUser[]> {
  const rows = await db
    .select({
      id: payrolls.id,
      orgId: payrolls.orgId,
      userId: payrolls.userId,
      month: payrolls.month,
      basicSalary: payrolls.basicSalary,
      hra: payrolls.hra,
      allowances: payrolls.allowances,
      deductions: payrolls.deductions,
      grossSalary: payrolls.grossSalary,
      netSalary: payrolls.netSalary,
      status: payrolls.status,
      generatedBy: payrolls.generatedBy,
      approvedBy: payrolls.approvedBy,
      overtimeType: payrolls.overtimeType,
      overtimeDays: payrolls.overtimeDays,
      overtimeHours: payrolls.overtimeHours,
      overtimeAmount: payrolls.overtimeAmount,
      payslipUrl: payrolls.payslipUrl,
      createdAt: payrolls.createdAt,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userDesignation: users.designation,
      userMonthlySalary: users.monthlySalary,
    })
    .from(payrolls)
    .innerJoin(users, eq(payrolls.userId, users.id))
    .where(and(eq(payrolls.orgId, orgId), eq(payrolls.month, month)))
    .orderBy(desc(payrolls.createdAt));

  return rows.map((r) => ({
    id: r.id,
    orgId: r.orgId,
    userId: r.userId,
    month: r.month,
    basicSalary: r.basicSalary,
    hra: r.hra,
    allowances: r.allowances,
    deductions: r.deductions,
    grossSalary: r.grossSalary,
    netSalary: r.netSalary,
    status: r.status,
    generatedBy: r.generatedBy,
    approvedBy: r.approvedBy,
    overtimeType: r.overtimeType,
    overtimeDays: r.overtimeDays,
    overtimeHours: r.overtimeHours,
    overtimeAmount: r.overtimeAmount,
    payslipUrl: r.payslipUrl,
    createdAt: r.createdAt,
    user: {
      firstName: r.userFirstName,
      lastName: r.userLastName,
      designation: r.userDesignation,
      monthlySalary: r.userMonthlySalary,
    },
  })) as PayrollWithUser[];
}

export async function getEmployeePayslips(orgId: string, userId: string): Promise<EmployeePayslip[]> {
  const rows = await db
    .select({
      id: payrolls.id,
      userId: payrolls.userId,
      month: payrolls.month,
      basicSalary: payrolls.basicSalary,
      hra: payrolls.hra,
      allowances: payrolls.allowances,
      deductions: payrolls.deductions,
      grossSalary: payrolls.grossSalary,
      netSalary: payrolls.netSalary,
      status: payrolls.status,
      overtimeType: payrolls.overtimeType,
      overtimeDays: payrolls.overtimeDays,
      overtimeHours: payrolls.overtimeHours,
      overtimeAmount: payrolls.overtimeAmount,
    })
    .from(payrolls)
    .where(and(eq(payrolls.orgId, orgId), eq(payrolls.userId, userId)))
    .orderBy(desc(payrolls.month));

  return rows as unknown as EmployeePayslip[];
}

export async function getMonthlyAttendance(
  orgId: string,
  userId: string,
  year: number,
  month: number
): Promise<AttendanceLog[]> {
  const mm = String(month).padStart(2, "0");
  const startDate = `${year}-${mm}-01`;
  const lastDay = new Date(year, month, 0).getDate();
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
