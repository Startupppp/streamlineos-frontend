import { db } from "@/lib/db";
import {
  organizations,
  organizationMembers,
  users,
  leads,
  leadActivities,
  tickets,
  leaveRequests,
} from "@/lib/db/schema";
import { eq, and, gte, sql, count } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { getWeeklyCeoRecapTemplate } from "@/lib/email-templates/weekly-ceo-recap";
import type { WeeklyCeoRecapData } from "@/lib/email-templates/weekly-ceo-recap";
import { logger } from "@/lib/logger";
import { subDays, format } from "date-fns";

export async function generateAndSendWeeklyCeoRecap() {
  const allOrgs = await db.query.organizations.findMany();
  const results: { orgId: string; sent: boolean; error?: string }[] = [];

  const weekStart = subDays(new Date(), 7);
  const weekRange = `${format(weekStart, "MMM d")} — ${format(new Date(), "MMM d, yyyy")}`;

  for (const org of allOrgs) {
    try {
      const owners = await db
        .select({ email: users.email, name: users.name })
        .from(organizationMembers)
        .innerJoin(users, eq(users.id, organizationMembers.userId))
        .where(
          and(
            eq(organizationMembers.orgId, org.id),
            eq(organizationMembers.role, "CEO"),
            eq(users.isActive, true)
          )
        );

      if (owners.length === 0) {
        results.push({ orgId: org.id, sent: false, error: "No active CEO" });
        continue;
      }

      const [
        [employeeCount],
        [newLeadCount],
        [convertedCount],
        [activityCount],
        [openTicketCount],
        [closedTicketCount],
        [pendingLeaveCount],
        pipelineRaw,
      ] = await Promise.all([
        db.select({ count: count() })
          .from(organizationMembers)
          .innerJoin(users, eq(users.id, organizationMembers.userId))
          .where(and(eq(organizationMembers.orgId, org.id), eq(users.isActive, true))),
        db.select({ count: count() })
          .from(leads)
          .where(and(eq(leads.orgId, org.id), gte(leads.createdAt, weekStart))),
        db.select({ count: count() })
          .from(leads)
          .where(and(eq(leads.orgId, org.id), eq(leads.status, "CONVERTED"), gte(leads.updatedAt, weekStart))),
        db.select({ count: count() })
          .from(leadActivities)
          .innerJoin(leads, eq(leads.id, leadActivities.leadId))
          .where(and(eq(leads.orgId, org.id), gte(leadActivities.createdAt, weekStart))),
        db.select({ count: count() })
          .from(tickets)
          .where(and(eq(tickets.orgId, org.id), sql`${tickets.status} NOT IN ('DONE', 'CANCELLED')`)),
        db.select({ count: count() })
          .from(tickets)
          .where(and(eq(tickets.orgId, org.id), eq(tickets.status, "DONE"), gte(tickets.updatedAt, weekStart))),
        db.select({ count: count() })
          .from(leaveRequests)
          .where(and(eq(leaveRequests.orgId, org.id), eq(leaveRequests.status, "PENDING"))),
        db.select({ status: leads.status, count: count() })
          .from(leads)
          .where(eq(leads.orgId, org.id))
          .groupBy(leads.status),
      ]);

      const leaderboardRaw = await db
        .select({
          userId: leads.assignedToId,
          name: users.name,
          converted: sql<number>`COUNT(CASE WHEN ${leads.status} = 'CONVERTED' THEN 1 END)`,
        })
        .from(leads)
        .innerJoin(users, eq(users.id, leads.assignedToId))
        .where(and(eq(leads.orgId, org.id), sql`${leads.assignedToId} IS NOT NULL`))
        .groupBy(leads.assignedToId, users.name)
        .orderBy(sql`COUNT(CASE WHEN ${leads.status} = 'CONVERTED' THEN 1 END) DESC`)
        .limit(5);

      const topPerformers = leaderboardRaw.map((r) => ({
        name: r.name || "Unknown",
        score: Number(r.converted) * 50,
      }));

      const recapData: WeeklyCeoRecapData = {
        weekRange,
        orgName: org.name,
        totalEmployees: employeeCount?.count ?? 0,
        newLeads: newLeadCount?.count ?? 0,
        convertedLeads: convertedCount?.count ?? 0,
        totalActivities: activityCount?.count ?? 0,
        openTickets: openTicketCount?.count ?? 0,
        closedTickets: closedTicketCount?.count ?? 0,
        pendingLeaves: pendingLeaveCount?.count ?? 0,
        topPerformers,
        pipelineSummary: pipelineRaw.map((r) => ({ status: r.status, count: r.count })),
      };

      const html = getWeeklyCeoRecapTemplate(recapData);

      for (const owner of owners) {
        if (!owner.email) continue;
        await sendEmail({
          to: owner.email,
          subject: `Weekly Recap — ${weekRange} | ${org.name}`,
          html,
        });
      }

      results.push({ orgId: org.id, sent: true });
    } catch (error) {
      logger.error("Weekly CEO recap failed for org", { orgId: org.id, error });
      results.push({ orgId: org.id, sent: false, error: String(error) });
    }
  }

  return { results, generatedAt: new Date().toISOString() };
}
