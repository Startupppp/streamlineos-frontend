import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { emailCampaigns, emailCampaignRecipients } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  status: z.string().optional(),
  recipientFilter: z.record(z.string(), z.unknown()).optional(),
});

type Ctx = { params: Promise<{ campaignId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { campaignId: id } = await ctx.params;
  const campaignId = Number(id);
  if (!Number.isFinite(campaignId)) return err("Invalid campaign id", 400);

  return withAuth(async (session) => {
    const [campaign] = await db
      .select({
        id: emailCampaigns.id,
        orgId: emailCampaigns.orgId,
        name: emailCampaigns.name,
        subject: emailCampaigns.subject,
        body: emailCampaigns.body,
        templateId: emailCampaigns.templateId,
        status: emailCampaigns.status,
        recipientFilter: emailCampaigns.recipientFilter,
        recipientCount: emailCampaigns.recipientCount,
        sentCount: emailCampaigns.sentCount,
        failedCount: emailCampaigns.failedCount,
        openCount: emailCampaigns.openCount,
        clickCount: emailCampaigns.clickCount,
        scheduledAt: emailCampaigns.scheduledAt,
        sentAt: emailCampaigns.sentAt,
        createdAt: emailCampaigns.createdAt,
        updatedAt: emailCampaigns.updatedAt,
      })
      .from(emailCampaigns)
      .where(and(eq(emailCampaigns.id, campaignId), eq(emailCampaigns.orgId, session.orgId)))
      .limit(1);
    if (!campaign) return err("Campaign not found", 404);

    const recipients = await db
      .select({
        id: emailCampaignRecipients.id,
        campaignId: emailCampaignRecipients.campaignId,
        leadId: emailCampaignRecipients.leadId,
        email: emailCampaignRecipients.email,
        name: emailCampaignRecipients.name,
        status: emailCampaignRecipients.status,
        sentAt: emailCampaignRecipients.sentAt,
      })
      .from(emailCampaignRecipients)
      .where(eq(emailCampaignRecipients.campaignId, campaignId));

    return ok({ ...campaign, recipients });
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { campaignId: id } = await ctx.params;
  const campaignId = Number(id);
  if (!Number.isFinite(campaignId)) return err("Invalid campaign id", 400);

  return withAuth(async (session) => {
    const input = await parseBody(req, updateSchema);
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) updateData.name = input.name;
    if (input.subject !== undefined) updateData.subject = input.subject;
    if (input.body !== undefined) updateData.body = input.body;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.recipientFilter !== undefined) updateData.recipientFilter = input.recipientFilter;

    const [updated] = await db
      .update(emailCampaigns)
      .set(updateData)
      .where(and(eq(emailCampaigns.id, campaignId), eq(emailCampaigns.orgId, session.orgId)))
      .returning();

    if (!updated) return err("Campaign not found", 404);
    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { campaignId: id } = await ctx.params;
  const campaignId = Number(id);
  if (!Number.isFinite(campaignId)) return err("Invalid campaign id", 400);

  return withAuth(async (session) => {
    await db.delete(emailCampaigns)
      .where(and(eq(emailCampaigns.id, campaignId), eq(emailCampaigns.orgId, session.orgId)));
    return ok({ success: true });
  });
}
