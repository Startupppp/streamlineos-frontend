"server-only";

import { db } from "@/lib/db";
import {
  projects,
  attendance,
  organizations,
  organizationMembers,
  users,
  projectMembers,
  sprints,
  tickets,
  crmActivities,
} from "@/lib/db/schema";
import { eq, and, desc, or, inArray, count, sql, gte, lt } from "drizzle-orm";
import { getTodayString } from "@/lib/date-utils";
import { isAdminOrOwner } from "@/lib/auth-helpers";

export async function getDashboardStats(orgId: string, _userId: string) {
  const today = getTodayString();

  const [org, memberCountResult, projectCountResult, attendanceCountResult] =
    await Promise.all([
      db.query.organizations.findFirst({
        where: eq(organizations.id, orgId),
      }),
      db
        .select({ count: count() })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(
          and(eq(organizationMembers.orgId, orgId), eq(users.isActive, true))
        ),
      db
        .select({ count: count() })
        .from(projects)
        .where(eq(projects.orgId, orgId)),
      db
        .select({ count: count() })
        .from(attendance)
        .where(
          and(eq(attendance.orgId, orgId), eq(attendance.date, today))
        ),
    ]);

  return {
    orgName: org?.name || "Organization",
    totalEmployees: Number(memberCountResult[0]?.count || 0),
    activeProjects: Number(projectCountResult[0]?.count || 0),
    presentToday: Number(attendanceCountResult[0]?.count || 0),
    orgSlug: org?.slug || orgId.slice(0, 8),
  };
}

export async function getRecentProjects(orgId: string, userId: string, role?: string | null) {
  const isOwnerOrAdmin = isAdminOrOwner(role ?? "");

  if (isOwnerOrAdmin) {
    return db.query.projects.findMany({
      where: eq(projects.orgId, orgId),
      orderBy: [desc(projects.id)],
      limit: 5,
      with: {
        manager: {
          columns: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            image: true,
          },
        },
      },
    });
  }

  const memberOf = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId));

  const projectIds = memberOf.map((m) => m.projectId);

  return db.query.projects.findMany({
    where: and(
      eq(projects.orgId, orgId),
      or(
        eq(projects.managerId, userId),
        projectIds.length > 0 ? inArray(projects.id, projectIds) : undefined
      )
    ),
    orderBy: [desc(projects.id)],
    limit: 5,
    with: {
      manager: {
        columns: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          image: true,
        },
      },
    },
  });
}

export async function getTeamAvailability(orgId: string) {
  const today = getTodayString();

  const todayAttendance = await db
    .select({
      userId: attendance.userId,
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      userName: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      userImage: users.image,
    })
    .from(attendance)
    .innerJoin(users, eq(attendance.userId, users.id))
    .where(and(eq(attendance.orgId, orgId), eq(attendance.date, today)));

  return todayAttendance.map((record) => ({
    userId: record.userId,
    name:
      record.firstName && record.lastName
        ? `${record.firstName} ${record.lastName}`
        : record.userName || "Unknown",
    image: record.userImage,
    checkIn: record.checkIn,
    checkOut: record.checkOut,
    isOnline: record.checkIn && !record.checkOut,
  }));
}

export async function getMyIssues(orgId: string, userId: string) {
  return db.query.tickets.findMany({
    where: and(
      eq(tickets.orgId, orgId),
      eq(tickets.assigneeId, userId)
    ),
    orderBy: [desc(tickets.updatedAt)],
    limit: 10,
    with: {
      project: {
        columns: { id: true, name: true, key: true },
      },
      assignee: {
        columns: { id: true, firstName: true, lastName: true, image: true },
      },
    },
  });
}

export async function getActiveSprintSummary(orgId: string, userId: string, role?: string | null) {
  const isOwnerOrAdmin = isAdminOrOwner(role ?? "");

  let projectIds: number[];
  if (isOwnerOrAdmin) {
    const allProjects = await db.query.projects.findMany({
      where: eq(projects.orgId, orgId),
      columns: { id: true },
    });
    projectIds = allProjects.map((p) => p.id);
  } else {
    const memberOf = await db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, userId));
    projectIds = memberOf.map((m) => m.projectId);
  }

  if (projectIds.length === 0) return null;

  const activeSprint = await db.query.sprints.findFirst({
    where: and(
      eq(sprints.orgId, orgId),
      eq(sprints.status, "ACTIVE"),
      inArray(sprints.projectId, projectIds)
    ),
    with: {
      project: {
        columns: { id: true, name: true },
      },
      tickets: {
        columns: { id: true, status: true, points: true },
      },
    },
  });

  if (!activeSprint) return null;

  const sprintTickets = activeSprint.tickets || [];
  const totalTickets = sprintTickets.length;
  const doneTickets = sprintTickets.filter((t) => t.status === "DONE").length;
  const inProgressTickets = sprintTickets.filter(
    (t) => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW"
  ).length;
  const todoTickets = totalTickets - doneTickets - inProgressTickets;
  const totalPoints = sprintTickets.reduce(
    (sum, t) => sum + (t.points || 0),
    0
  );
  const completedPoints = sprintTickets
    .filter((t) => t.status === "DONE")
    .reduce((sum, t) => sum + (t.points || 0), 0);
  const progress =
    totalPoints > 0
      ? Math.round((completedPoints / totalPoints) * 100)
      : totalTickets > 0
      ? Math.round((doneTickets / totalTickets) * 100)
      : 0;

  const now = new Date();
  const endDate = new Date(activeSprint.endDate);
  const daysRemaining = Math.ceil(
    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    id: activeSprint.id,
    name: activeSprint.name,
    projectName: activeSprint.project?.name || "Project",
    projectId: activeSprint.project?.id,
    progress,
    daysRemaining,
    totalTickets,
    doneTickets,
    inProgressTickets,
    todoTickets,
    totalPoints,
    completedPoints,
  };
}

export async function getRoleStats(orgId: string): Promise<Record<string, number>> {
  const rows = await db
    .select({ role: users.role, cnt: sql<number>`count(*)::int` })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(and(eq(organizationMembers.orgId, orgId), eq(users.isActive, true)))
    .groupBy(users.role);
  return Object.fromEntries(rows.map((r) => [r.role, r.cnt]));
}

export async function getTodayActivities(orgId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const activities = await db.query.crmActivities.findMany({
    where: and(
      eq(crmActivities.orgId, orgId),
      gte(crmActivities.createdAt, todayStart),
      lt(crmActivities.createdAt, tomorrowStart)
    ),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
    limit: 20,
  });
  return activities.map((a) => ({ type: a.type, subject: a.message }));
}

export async function getRecentActivity(orgId: string, userId: string, role?: string | null) {
  const isOwnerOrAdmin = isAdminOrOwner(role ?? "");

  let projectIds: number[];
  if (isOwnerOrAdmin) {
    const allProjects = await db.query.projects.findMany({
      where: eq(projects.orgId, orgId),
      columns: { id: true },
    });
    projectIds = allProjects.map((p) => p.id);
  } else {
    const memberOf = await db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, userId));
    projectIds = memberOf.map((m) => m.projectId);
  }

  if (projectIds.length === 0) return [];

  const ticketFilters = [
    eq(tickets.orgId, orgId),
    inArray(tickets.projectId, projectIds),
  ];

  if (!isOwnerOrAdmin) {
    ticketFilters.push(
      or(
        eq(tickets.assigneeId, userId),
        eq(tickets.reporterId, userId)
      )!
    );
  }

  const recentTickets = await db.query.tickets.findMany({
    where: and(...ticketFilters),
    orderBy: [desc(tickets.updatedAt)],
    limit: 10,
    with: {
      project: {
        columns: { id: true, name: true, key: true },
      },
      assignee: {
        columns: { id: true, firstName: true, lastName: true, image: true },
      },
    },
  });

  return recentTickets.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    type: t.type,
    priority: t.priority,
    ticketNumber: t.ticketNumber,
    updatedAt: t.updatedAt,
    projectName: t.project?.name || "",
    projectId: t.project?.id,
    projectKey: t.project?.key || "",
    assignee: t.assignee
      ? {
          id: t.assignee.id,
          firstName: t.assignee.firstName,
          lastName: t.assignee.lastName,
          image: t.assignee.image,
        }
      : null,
  }));
}
