import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { projects, attendance } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { format } from "date-fns";

import { TRPCError } from "@trpc/server";

export const dashboardRouter = createTRPCRouter({
  getStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const { clerkClient } = await import("@clerk/nextjs/server");
      const client = await clerkClient();
      
      let org;
      let memberships;
      
      try {
        org = await client.organizations.getOrganization({ 
          organizationId: ctx.session.orgId 
        });
      } catch (orgError) {
        console.error("Error fetching organization:", orgError);
        // If organization doesn't exist yet, return default values
        return {
          orgName: "Organization",
          totalEmployees: 0,
          activeProjects: 0,
          presentToday: 0,
          orgSlug: ctx.session.orgId.slice(0, 8),
        };
      }
      
      try {
        memberships = await client.organizations.getOrganizationMembershipList({ 
          organizationId: ctx.session.orgId 
        });
      } catch (membershipError) {
        console.error("Error fetching memberships:", membershipError);
        memberships = { totalCount: 0, data: [] };
      }
      
      const activeProjectsCount = (await ctx.db.query.projects.findMany({
        where: eq(projects.orgId, ctx.session.orgId)
      })).length;

      const today = format(new Date(), "yyyy-MM-dd");
      const presentCount = (await ctx.db.query.attendance.findMany({
        where: and(eq(attendance.orgId, ctx.session.orgId), eq(attendance.date, today))
      })).length;

      return {
        orgName: org?.name || "Organization",
        totalEmployees: memberships?.totalCount || 0,
        activeProjects: activeProjectsCount,
        presentToday: presentCount,
        orgSlug: org?.slug || ctx.session.orgId.slice(0, 8),
      };
    } catch (error) {
      console.error("Dashboard getStats error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to load dashboard stats",
      });
    }
  }),
});
