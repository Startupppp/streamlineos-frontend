import { type NextRequest } from "next/server";
import { withAuth, withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { getLead } from "@/server/queries/leads";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { recalculateLeadScore } from "@/server/lib/lead-triggers";
import { logger } from "@/lib/logger";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  source: z.enum(["referral", "campaign", "cold_call", "website", "social_media", "walk_in", "other"]).optional(),
  campaignId: z.number().optional(),
  investmentInterest: z.string().optional(),
  potentialValue: z.string().optional(),
  notes: z.string().optional(),
  company: z.string().optional(),
  designation: z.string().optional(),
  city: z.string().optional(),
  tags: z.array(z.string()).optional(),
  lostReason: z.string().optional(),
  priority: z.enum(["HOT", "WARM", "COLD"]).optional(),
});

type Ctx = { params: Promise<{ leadId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { leadId: id } = await ctx.params;
  const leadId = Number(id);
  if (!Number.isFinite(leadId)) return err("Invalid lead id", 400);

  return withAuth(async (session) => {
    const lead = await getLead(session.orgId!, leadId);
    if (!lead) return err("Lead not found", 404);
    return ok(lead);
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { leadId: id } = await ctx.params;
  const leadId = Number(id);
  if (!Number.isFinite(leadId)) return err("Invalid lead id", 400);

  return withAuth(async (session) => {
    const input = await parseBody(req, updateSchema);
    const { ...data } = input;

    const [updated] = await db.update(leads)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(leads.id, leadId), eq(leads.orgId, session.orgId!)))
      .returning();

    if (!updated) return err("Lead not found", 404);

    try {
      await recalculateLeadScore(db, session.orgId!, updated.id);
    } catch (e) {
      logger.error("Auto-trigger: lead scoring on update failed", { leadId: updated.id, error: e });
    }

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { leadId: id } = await ctx.params;
  const leadId = Number(id);
  if (!Number.isFinite(leadId)) return err("Invalid lead id", 400);

  return withAdmin(async (session) => {
    await db.delete(leads)
      .where(and(eq(leads.id, leadId), eq(leads.orgId, session.orgId!)));
    return ok({ success: true });
  });
}
