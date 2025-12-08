import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { projects, attendance } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { format } from "date-fns";

export const dashboardRouter = createTRPCRouter({
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    
    const org = await client.organizations.getOrganization({ 
      organizationId: ctx.session.orgId 
    });
    const memberships = await client.organizations.getOrganizationMembershipList({ 
      organizationId: ctx.session.orgId 
    });
    
    const activeProjectsCount = (await ctx.db.query.projects.findMany({
      where: eq(projects.orgId, ctx.session.orgId)
    })).length;

    const today = format(new Date(), "yyyy-MM-dd");
    const presentCount = (await ctx.db.query.attendance.findMany({
      where: and(eq(attendance.orgId, ctx.session.orgId), eq(attendance.date, today))
    })).length;

    return {
      orgName: org.name,
      totalEmployees: memberships.totalCount,
      activeProjects: activeProjectsCount,
      presentToday: presentCount,
      orgSlug: org.slug || ctx.session.orgId.slice(0, 8),
    };
  }),
});
