"server-only";

import { db } from "@/lib/db";
import { departments, organizationMembers, users, leaveRequests, attendance } from "@/lib/db/schema";
import { timesheets, projectMembers, projects, tickets } from "@/lib/db/schema/projects";
import { eq, and, desc, gte, lte, ilike, or, count } from "drizzle-orm";
import { branchIdFilter, type BranchContext } from "@/lib/db/branch-filter";
import type {
  Department,
  Employee,
  EmployeeStats,
  OrgChartNode,
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
      role: u.role ?? "EMPLOYEE",
      designation: u.designation,
      employeeId: u.employeeId,
      departmentId: u.departmentId,
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
      role: u.role ?? "EMPLOYEE",
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
