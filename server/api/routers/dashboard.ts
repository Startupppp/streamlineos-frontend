import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { projects, attendance, organizations, organizationMembers, users, projectMembers, sprints, tickets, leadActivities } from "@/lib/db/schema";
import { eq, and, sql, desc, or, inArray, count, gte, lt } from "drizzle-orm";
import { getTodayString } from "@/lib/date-utils";

import { TRPCError } from "@trpc/server";
import { isAdminOrOwner } from "@/lib/auth-helpers";

export const dashboardRouter = createTRPCRouter({
  getStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userMemberships = await ctx.db.query.organizationMembers.findMany({
        where: eq(organizationMembers.userId, ctx.session.userId),
        limit: 1,
      });

      if (!userMemberships || userMemberships.length === 0) {
        return {
          orgName: "Organization",
          totalEmployees: 0,
          activeProjects: 0,
          presentToday: 0,
          orgSlug: "",
        };
      }

      const orgId = userMemberships[0].orgId;
      const today = getTodayString();

      const [org, memberCountResult, projectCountResult, attendanceCountResult] = await Promise.all([
        ctx.db.query.organizations.findFirst({
          where: eq(organizations.id, orgId),
        }),
        ctx.db
          .select({ count: count() })
          .from(organizationMembers)
          .innerJoin(users, eq(organizationMembers.userId, users.id))
          .where(and(
            eq(organizationMembers.orgId, orgId),
            eq(users.isActive, true)
          )),
        ctx.db
          .select({ count: count() })
          .from(projects)
          .where(eq(projects.orgId, orgId)),
        ctx.db
          .select({ count: count() })
          .from(attendance)
          .where(and(
            eq(attendance.orgId, orgId),
            eq(attendance.date, today)
          )),
      ]);

      return {
        orgName: org?.name || "Organization",
        totalEmployees: Number(memberCountResult[0]?.count || 0),
        activeProjects: Number(projectCountResult[0]?.count || 0),
        presentToday: Number(attendanceCountResult[0]?.count || 0),
        orgSlug: org?.slug || orgId.slice(0, 8),
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to load dashboard stats",
      });
    }
  }),

  getRecentProjects: protectedProcedure.query(async ({ ctx }) => {
    const isOwnerOrAdmin = isAdminOrOwner(ctx.session.user.role);

    let recentProjects;

    if (isOwnerOrAdmin) {
      recentProjects = await ctx.db.query.projects.findMany({
        where: eq(projects.orgId, ctx.session.orgId),
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
    } else {
      const memberOf = await ctx.db
        .select({ projectId: projectMembers.projectId })
        .from(projectMembers)
        .where(eq(projectMembers.userId, ctx.session.userId));

      const projectIds = memberOf.map((m) => m.projectId);

      recentProjects = await ctx.db.query.projects.findMany({
        where: and(
          eq(projects.orgId, ctx.session.orgId),
          or(
            eq(projects.managerId, ctx.session.userId),
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

    return recentProjects;
  }),

  getTeamAvailability: protectedProcedure.query(async ({ ctx }) => {
    const today = getTodayString();

    const todayAttendance = await ctx.db
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
      .where(
        and(
          eq(attendance.orgId, ctx.session.orgId),
          eq(attendance.date, today)
        )
      );

    return todayAttendance.map((record) => ({
      userId: record.userId,
      name: record.firstName && record.lastName
        ? `${record.firstName} ${record.lastName}`
        : record.userName || "Unknown",
      image: record.userImage,
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      isOnline: record.checkIn && !record.checkOut,
    }));
  }),

  getActiveSprintSummary: protectedProcedure.query(async ({ ctx }) => {
    const isOwnerOrAdmin = isAdminOrOwner(ctx.session.user.role);

    let projectIds: number[];
    if (isOwnerOrAdmin) {
      const allProjects = await ctx.db.query.projects.findMany({
        where: eq(projects.orgId, ctx.session.orgId),
        columns: { id: true },
      });
      projectIds = allProjects.map(p => p.id);
    } else {
      const memberOf = await ctx.db
        .select({ projectId: projectMembers.projectId })
        .from(projectMembers)
        .where(eq(projectMembers.userId, ctx.session.userId));
      projectIds = memberOf.map(m => m.projectId);
    }

    if (projectIds.length === 0) return null;

    const activeSprint = await ctx.db.query.sprints.findFirst({
      where: and(
        eq(sprints.orgId, ctx.session.orgId),
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
    const doneTickets = sprintTickets.filter(t => t.status === "DONE").length;
    const inProgressTickets = sprintTickets.filter(t => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW").length;
    const todoTickets = totalTickets - doneTickets - inProgressTickets;
    const totalPoints = sprintTickets.reduce((sum, t) => sum + (t.points || 0), 0);
    const completedPoints = sprintTickets.filter(t => t.status === "DONE").reduce((sum, t) => sum + (t.points || 0), 0);
    const progress = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : (totalTickets > 0 ? Math.round((doneTickets / totalTickets) * 100) : 0);

    const now = new Date();
    const endDate = new Date(activeSprint.endDate);
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

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
  }),

  getRecentActivity: protectedProcedure.query(async ({ ctx }) => {
    const isOwnerOrAdmin = isAdminOrOwner(ctx.session.user.role);

    let projectIds: number[];
    if (isOwnerOrAdmin) {
      const allProjects = await ctx.db.query.projects.findMany({
        where: eq(projects.orgId, ctx.session.orgId),
        columns: { id: true },
      });
      projectIds = allProjects.map(p => p.id);
    } else {
      const memberOf = await ctx.db
        .select({ projectId: projectMembers.projectId })
        .from(projectMembers)
        .where(eq(projectMembers.userId, ctx.session.userId));
      projectIds = memberOf.map(m => m.projectId);
    }

    if (projectIds.length === 0) return [];

    const recentTickets = await ctx.db.query.tickets.findMany({
      where: and(
        eq(tickets.orgId, ctx.session.orgId),
        inArray(tickets.projectId, projectIds)
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

    return recentTickets.map(t => ({
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
      assignee: t.assignee ? {
        id: t.assignee.id,
        firstName: t.assignee.firstName,
        lastName: t.assignee.lastName,
        image: t.assignee.image,
      } : null,
    }));
  }),

  getTodayScheduledActivities: protectedProcedure.query(async ({ ctx }) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const activities = await ctx.db
      .select({
        id: leadActivities.id,
        type: leadActivities.type,
        subject: leadActivities.subject,
        date: leadActivities.date,
        location: leadActivities.location,
      })
      .from(leadActivities)
      .where(
        and(
          eq(leadActivities.orgId, ctx.session.orgId),
          eq(leadActivities.userId, ctx.session.userId),
          gte(leadActivities.date, todayStart),
          lt(leadActivities.date, todayEnd),
          inArray(leadActivities.type, ["meeting", "call"])
        )
      );

    return activities;
  }),
});
