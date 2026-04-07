import { createTRPCRouter, protectedProcedure } from "../trpc";
import { projects, attendance, organizations, organizationMembers, users, projectMembers } from "../../../lib/db/schema";
import { eq, and, sql, desc, or, inArray } from "drizzle-orm";
import { format } from "date-fns";

import { TRPCError } from "@trpc/server";

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

      const org = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.id, orgId),
      });

      const memberCountResult = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(and(
          eq(organizationMembers.orgId, orgId),
          eq(users.isActive, true)
        ));

      const totalEmployees = Number(memberCountResult[0]?.count || 0);

      const activeProjectsCount = (
        await ctx.db.query.projects.findMany({
          where: eq(projects.orgId, orgId),
        })
      ).length;

      const today = format(new Date(), "yyyy-MM-dd");
      const presentCount = (
        await ctx.db.query.attendance.findMany({
          where: and(
            eq(attendance.orgId, orgId),
            eq(attendance.date, today)
          ),
        })
      ).length;

      return {
        orgName: org?.name || "Organization",
        totalEmployees,
        activeProjects: activeProjectsCount,
        presentToday: presentCount,
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
    const isOwnerOrAdmin = ctx.session.user.role === "OWNER" || ctx.session.user.role === "ADMIN";

    let recentProjects;

    // OWNER/ADMIN can see all projects in the list
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
      // Regular users can only see projects they are assigned to
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
    const today = format(new Date(), "yyyy-MM-dd");

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
});
