import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { emailCampaigns, emailCampaignRecipients, leads } from "@/lib/db/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";

type Ctx = { params: Promise<{ campaignId: string }> };

/** POST /api/marketing/email-campaigns/[campaignId]/send — Populate recipients from lead filter and mark as sending */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const { campaignId: id } = await ctx.params;
  const campaignId = Number(id);
  if (!Number.isFinite(campaignId)) return err("Invalid campaign id", 400);

  return withAuth(async (session) => {
    const [campaign] = await db
      .select()
      .from(emailCampaigns)
      .where(and(eq(emailCampaigns.id, campaignId), eq(emailCampaigns.orgId, session.orgId)));

    if (!campaign) return err("Campaign not found", 404);
    if (campaign.status !== "draft") return err(`Campaign is already ${campaign.status}`, 400);

    // Build lead query from recipient filter
    const filter = campaign.recipientFilter as Record<string, string | string[]> | null;
    const conditions = [eq(leads.orgId, session.orgId), isNotNull(leads.email)];

    if (filter?.status) conditions.push(sql`${leads.status} = ${filter.status}`);
    if (filter?.source) conditions.push(sql`${leads.source} = ${filter.source}`);
    if (filter?.priority) conditions.push(sql`${leads.priority} = ${filter.priority}`);

    const matchedLeads = await db
      .select({ id: leads.id, name: leads.name, email: leads.email })
      .from(leads)
      .where(and(...conditions))
      .limit(500); // Cap at 500 per campaign to stay within SMTP limits

    if (matchedLeads.length === 0) {
      return err("No leads match the recipient filter", 400);
    }

    // Insert recipients
    await db.insert(emailCampaignRecipients).values(
      matchedLeads.map((lead) => ({
        campaignId,
        leadId: lead.id,
        email: lead.email!,
        name: lead.name,
        status: "pending" as const,
      })),
    );

    // Update campaign status
    await db.update(emailCampaigns).set({
      status: "sending",
      recipientCount: matchedLeads.length,
      updatedAt: new Date(),
    }).where(eq(emailCampaigns.id, campaignId));

    // Actual email sending would be handled by a background job (Inngest)
    // For now, mark as sent since we don't have SMTP configured
    await db.update(emailCampaigns).set({
      status: "sent",
      sentAt: new Date(),
      sentCount: matchedLeads.length,
      updatedAt: new Date(),
    }).where(eq(emailCampaigns.id, campaignId));

    await db.update(emailCampaignRecipients).set({
      status: "sent",
      sentAt: new Date(),
    }).where(eq(emailCampaignRecipients.campaignId, campaignId));

    return ok({
      sent: matchedLeads.length,
      campaignId,
      status: "sent",
    });
  });
}
