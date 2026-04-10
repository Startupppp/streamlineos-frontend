import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const mergeSchema = z.object({
  mergeLeadId: z.number().int().positive(),
});

type Ctx = { params: Promise<{ leadId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { leadId: id } = await ctx.params;
  const keepLeadId = Number(id);
  if (!Number.isFinite(keepLeadId)) return err("Invalid lead id", 400);

  return withAuth(async (session) => {
    const { mergeLeadId } = await parseBody(req, mergeSchema);

    if (mergeLeadId === keepLeadId) {
      return err("Cannot merge a lead with itself", 400);
    }

    // Verify keep lead exists in this org
    const [keepLead] = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.id, keepLeadId), eq(leads.orgId, session.orgId)));

    if (!keepLead) return err("Lead not found", 404);

    // Verify duplicate lead exists in this org
    const [mergeLead] = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.id, mergeLeadId), eq(leads.orgId, session.orgId)));

    if (!mergeLead) return err("Duplicate lead not found", 404);

    // Soft-delete the duplicate: mark as LOST with merge note
    await db
      .update(leads)
      .set({
        status: "LOST",
        lostReason: `Merged with lead #${keepLeadId}`,
        notes: `Merged with lead #${keepLeadId} — this record is a duplicate.`,
        updatedAt: new Date(),
      })
      .where(and(eq(leads.id, mergeLeadId), eq(leads.orgId, session.orgId)));

    return ok({ success: true });
  });
}
