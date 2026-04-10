import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { emailCampaigns, leads } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";

const bodySchema = z.object({
  leadIds: z.array(z.number().int().positive()).min(1, "At least one lead is required"),
});

/** POST /api/marketing/email-campaigns/:campaignId/bulk-send */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  return withAuth(async (session) => {
    const { campaignId: campaignIdStr } = await params;
    const campaignId = Number(campaignIdStr);
    if (isNaN(campaignId) || campaignId <= 0) return err("Invalid campaign ID", 400);

    const { leadIds } = await parseBody(req, bodySchema);

    // Verify campaign belongs to org and is a draft
    const [campaign] = await db
      .select({ id: emailCampaigns.id, status: emailCampaigns.status })
      .from(emailCampaigns)
      .where(and(eq(emailCampaigns.id, campaignId), eq(emailCampaigns.orgId, session.orgId)));

    if (!campaign) return err("Campaign not found", 404);
    if (campaign.status !== "draft") return err("Only draft campaigns can be sent", 400);

    // Count valid leads that have emails
    const matchedLeads = await db
      .select({ id: leads.id, email: leads.email })
      .from(leads)
      .where(
        and(
          eq(leads.orgId, session.orgId),
          inArray(leads.id, leadIds),
        ),
      );

    const validLeads = matchedLeads.filter((l) => l.email != null);
    const sentCount = validLeads.length;

    // Update campaign: mark as sent with counts
    await db
      .update(emailCampaigns)
      .set({
        status: "sent",
        sentCount: sentCount,
        recipientCount: sentCount,
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(emailCampaigns.id, campaignId));

    return ok({ sent: sentCount, campaignId });
  });
}
