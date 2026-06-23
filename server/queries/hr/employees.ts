"server-only";

import { db } from "@/lib/db";
import {
  departments,
  organizationMembers,
  assets,
  documents,
  helpdeskTickets,
  users,
  employeeDevices,
} from "@/lib/db/schema";
import { timesheets, projectMembers, projects, tickets } from "@/lib/db/schema/projects";
import { eq, and, desc, asc, isNull, sql, ilike, or, count } from "drizzle-orm";
import { branchIdFilter, type BranchContext } from "@/lib/db/branch-filter";
import type {
  Department,
  Employee,
  Asset,
  Document,
  HelpdeskTicket,
  EmployeeStats,
  WorkLog,
  OrgChartNode,
  PaginatedEmployees,
  Device,
} from "@/types/hr";
import type { DocumentType } from "@/types/hr";
import {
  attendance,
  leaveRequests,
} from "@/lib/db/schema";
import { gte, lte } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";

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
      user: {
        with: { department: true },
      },
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
      role: u.role ?? "EMPLOYEE",
      designation: u.designation,
      employeeId: u.employeeId,
      departmentId: u.departmentId,
      department: u.department ? { id: u.department.id, name: u.department.name } : null,
      image: u.image,
      isActive: u.isActive ?? true,
      joiningDate: u.joiningDate,
      hasDashboardAccess: u.hasDashboardAccess ?? false,
      reportingTo: u.reportingTo,
      monthlySalary: u.monthlySalary,
      bio: u.bio ?? null,
      linkedinUrl: u.linkedinUrl ?? null,
      twitterUrl: u.twitterUrl ?? null,
      githubUrl: u.githubUrl ?? null,
      websiteUrl: u.websiteUrl ?? null,
      skills: u.skills ?? null,
      phone: u.phone ?? null,
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
          ilike(users.employeeId, `%${search}%`),
          ilike(users.designation, `%${search}%`)
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
    bio: u.bio ?? null,
    linkedinUrl: u.linkedinUrl ?? null,
    twitterUrl: u.twitterUrl ?? null,
    githubUrl: u.githubUrl ?? null,
    websiteUrl: u.websiteUrl ?? null,
    skills: u.skills ?? null,
    phone: u.phone ?? null,
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
    conditions.push(eq(documents.type, params.type as DocumentType));
  }

  return db.query.documents.findMany({
    where: and(...conditions),
    orderBy: [desc(documents.createdAt)],
  }) as unknown as Promise<Document[]>;
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

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(/[\s_]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function getOrgChart(orgId: string): Promise<OrgChartNode[]> {
  const [members, deptRows] = await Promise.all([
    db.query.organizationMembers.findMany({
      where: eq(organizationMembers.orgId, orgId),
      with: { user: true },
    }),
    db.select({ id: departments.id, name: departments.name }).from(departments).where(eq(departments.orgId, orgId)),
  ]);

  const deptMap = new Map<number, string>(deptRows.map((d) => [d.id, d.name]));
  const seen = new Set<string>();
  const result: OrgChartNode[] = [];

  for (const m of members) {
    const u = m.user;
    if (!u || seen.has(u.id) || u.isActive === false) continue;
    seen.add(u.id);
    result.push({
      id: u.id,
      name: u.name,
      email: u.email,
      role: toTitleCase(u.role ?? "Employee"),
      designation: u.designation,
      image: u.image,
      departmentId: u.departmentId,
      departmentName: u.departmentId ? (deptMap.get(u.departmentId) ?? null) : null,
      reportingTo: u.reportingTo,
    });
  }

  return result;
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

export async function getWorkLogs(
  orgId: string,
  userId: string,
  year: number,
  quarter: number,
  filterUserId?: string,
  month?: number,
  dateFrom?: string,
  dateTo?: string
): Promise<WorkLog[]> {
  const targetUserId = filterUserId || userId;

  const startMonth = (quarter - 1) * 3;
  const quarterStart = formatDateOnly(new Date(year, startMonth, 1));
  const quarterEnd = formatDateOnly(new Date(year, startMonth + 3, 0));

  const effectiveFrom = dateFrom && dateFrom >= quarterStart ? dateFrom : quarterStart;
  const effectiveTo = dateTo && dateTo <= quarterEnd ? dateTo : quarterEnd;

  const conditions = [
    eq(timesheets.orgId, orgId),
    eq(timesheets.userId, targetUserId),
    isNull(timesheets.ticketId),
    gte(timesheets.date, effectiveFrom),
    lte(timesheets.date, effectiveTo),
  ];

  if (month !== undefined) {
    conditions.push(sql`EXTRACT(MONTH FROM ${timesheets.date}) = ${month + 1}`);
    conditions.push(sql`EXTRACT(YEAR FROM ${timesheets.date}) = ${year}`);
  }

  const logs = await db.query.timesheets.findMany({
    where: and(...conditions),
    orderBy: [asc(timesheets.date)],
  });

  const seenDates = new Set<string>();
  return logs
    .map((l) => ({ ...l, date: String(l.date).slice(0, 10) }))
    .filter((l) => {
      if (seenDates.has(l.date)) return false;
      seenDates.add(l.date);
      return true;
    }) as unknown as WorkLog[];
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
