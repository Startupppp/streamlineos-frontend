import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

/**
 * Cron endpoint for scheduled report delivery.
 * Called by Vercel Cron or external cron service.
 *
 * Daily 9 AM: Lead activity summary → HR
 * Weekly Monday: Sales performance → HR, CEO
 * Monthly 1st: Full suite → HR, CEO
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday
  const dayOfMonth = now.getDate();

  try {
    const orgs = await db.query.organizations.findMany();

    for (const org of orgs) {
      // Daily report (9 AM)
      try {
        logger.info(`Sending daily report for org ${org.id}`);
        // TODO: Generate and send daily lead activity summary
      } catch (err) {
        logger.error("Daily report failed", { orgId: org.id, error: err });
      }

      // Weekly report (Monday)
      if (dayOfWeek === 1) {
        try {
          logger.info(`Sending weekly report for org ${org.id}`);
          // TODO: Generate and send weekly sales performance
        } catch (err) {
          logger.error("Weekly report failed", { orgId: org.id, error: err });
        }
      }

      // Monthly report (1st of month)
      if (dayOfMonth === 1) {
        try {
          logger.info(`Sending monthly report for org ${org.id}`);
          // TODO: Generate and send monthly full suite
        } catch (err) {
          logger.error("Monthly report failed", { orgId: org.id, error: err });
        }
      }
    }

    return NextResponse.json({ success: true, processedOrgs: orgs.length });
  } catch (error) {
    logger.error("Scheduled reports cron failed", { error });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
