import { createTRPCRouter, protectedProcedure } from "../trpc";
import { projects, attendance, organizations, organizationMembers, users } from "../../../lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
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
});
