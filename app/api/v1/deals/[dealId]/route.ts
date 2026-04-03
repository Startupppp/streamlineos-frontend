import { type NextRequest } from "next/server";
import { withAuth, withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { getDeal } from "@/server/queries/crm";
import { db } from "@/lib/db";
import { deals, dealActivities } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  value: z.string().optional(),
  stage: z.enum(["LEAD", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]).optional(),
  probability: z.number().min(0).max(100).optional(),
  contactPerson: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  assignedToId: z.string().optional(),
  expectedCloseDate: z.string().nullable().optional(),
  actualCloseDate: z.string().nullable().optional(),
  lostReason: z.string().optional(),
  notes: z.string().optional(),
});

type Ctx = { params: Promise<{ dealId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { dealId: id } = await ctx.params;
  const dealId = Number(id);
  if (!Number.isFinite(dealId)) return err("Invalid deal id", 400);

  return withAuth(async (session) => {
    const deal = await getDeal(session.orgId!, dealId);
    if (!deal) return err("Deal not found", 404);
    return ok(deal);
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { dealId: id } = await ctx.params;
  const dealId = Number(id);
  if (!Number.isFinite(dealId)) return err("Invalid deal id", 400);

  return withAuth(async (session) => {
    const input = await parseBody(req, updateSchema);
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    // Handle stage change side effects
    if (input.stage !== undefined) {
      const existing = await db.query.deals.findFirst({
        where: and(eq(deals.id, dealId), eq(deals.orgId, session.orgId!)),
        columns: { stage: true },
      });

      if (input.stage === "WON") {
        updateData.actualCloseDate = new Date().toISOString().split("T")[0];
        updateData.probability = 100;
      } else if (input.stage === "LOST") {
        updateData.actualCloseDate = new Date().toISOString().split("T")[0];
        updateData.probability = 0;
      }

      // Log stage change if changed
      if (existing && existing.stage !== input.stage) {
        db.insert(dealActivities).values({
          orgId: session.orgId!,
          dealId,
          type: "stage_change",
          previousValue: existing.stage,
          newValue: input.stage,
          subject: `Stage changed from ${existing.stage} to ${input.stage}`,
          userId: session.user.id,
        }).catch(() => {});
      }
    }

    for (const [key, val] of Object.entries(input)) {
      if (val !== undefined) updateData[key] = val;
    }

    const [updated] = await db.update(deals)
      .set(updateData)
      .where(and(eq(deals.id, dealId), eq(deals.orgId, session.orgId!)))
      .returning();

    if (!updated) return err("Deal not found", 404);
    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { dealId: id } = await ctx.params;
  const dealId = Number(id);
  if (!Number.isFinite(dealId)) return err("Invalid deal id", 400);

  return withAdmin(async (session) => {
    await db.delete(deals)
      .where(and(eq(deals.id, dealId), eq(deals.orgId, session.orgId!)));
    return ok({ success: true });
  });
}
