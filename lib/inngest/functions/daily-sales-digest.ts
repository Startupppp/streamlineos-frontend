import { inngest } from "../client";
import { db } from "@/lib/db";
import { deals, leads, organizations, organizationMembers } from "@/lib/db/schema";
import { eq, and, gte, count, sql } from "drizzle-orm";
import { subDays } from "date-fns";
import { createNotification } from "@/server/actions/create-notification";
import { logger } from "@/lib/logger";

/**
 * Daily Sales Digest — runs at 8:30 AM IST every weekday.
 * Sends a summary notification to CEO and sales managers with:
 * - New leads today
 * - Deals won today
 * - Pipeline value
 * - Overdue follow-ups
 */
export const dailySalesDigest = inngest.createFunction(
  {
    id: "daily-sales-digest",
    name: "Daily Sales Digest",
    triggers: { cron: "30 3 * * 1-5" }, // 8:30 AM IST (UTC+5:30) Mon-Fri
  },
  async ({ step }) => {
    const orgs = await step.run("fetch-orgs", () =>
      db.select({ id: organizations.id }).from(organizations),
    );

    let totalDigestsSent = 0;

    for (const org of orgs) {
      await step.run(`digest-${org.id}`, async () => {
        const yesterday = subDays(new Date(), 1);

        // Aggregate daily metrics
        const [leadStats] = await db
          .select({ count: count() })
          .from(leads)
          .where(and(eq(leads.orgId, org.id), gte(leads.createdAt, yesterday)));

        const [dealStats] = await db
          .select({
            wonCount: sql<number>`count(*) filter (where ${deals.stage} = 'WON' and ${deals.updatedAt} >= ${yesterday})`,
            pipelineValue: sql<number>`coalesce(sum(${deals.value}::numeric) filter (where ${deals.stage} not in ('WON', 'LOST')), 0)`,
          })
          .from(deals)
          .where(eq(deals.orgId, org.id));

        const overdueFollowUps = await db
          .select({ count: count() })
          .from(leads)
          .where(and(
            eq(leads.orgId, org.id),
            sql`${leads.followUpDate} IS NOT NULL AND ${leads.followUpDate} < NOW()`,
          ));

        const newLeads = leadStats?.count ?? 0;
        const dealsWon = Number(dealStats?.wonCount ?? 0);
        const pipeline = Number(dealStats?.pipelineValue ?? 0);
        const overdue = overdueFollowUps[0]?.count ?? 0;

        // Find CEO and managers to notify
        const managers = await db
          .select({ userId: organizationMembers.userId })
          .from(organizationMembers)
          .where(and(
            eq(organizationMembers.orgId, org.id),
            sql`${organizationMembers.role} IN ('CEO', 'HR', 'BRANCH_MANAGER')`,
          ));

        const message = [
          `New Leads: ${newLeads}`,
          `Deals Won: ${dealsWon}`,
          `Pipeline: ₹${(pipeline / 100000).toFixed(1)}L`,
          overdue > 0 ? `Overdue Follow-ups: ${overdue}` : null,
        ].filter(Boolean).join(" · ");

        for (const mgr of managers) {
          await createNotification({
            orgId: org.id,
            userId: mgr.userId,
            type: "INFO",
            title: "Daily Sales Digest",
            message,
            link: "/sales",
          });
          totalDigestsSent++;
        }
      });
    }

    logger.info(`[daily-sales-digest] Sent ${totalDigestsSent} digests`);
    return { sent: totalDigestsSent };
  },
);
