import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const patchSchema = z.object({
  customData: z.record(z.string(), z.unknown()),
});

type Ctx = { params: Promise<{ leadId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { leadId: rawId } = await ctx.params;
  const leadId = Number(rawId);
  if (!Number.isFinite(leadId)) return err("Invalid lead id", 400);

  let data: z.infer<typeof patchSchema>;
  try {
    const body = await req.json();
    data = patchSchema.parse(body);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return err(e.issues.map((i) => i.message).join("; "), 400);
    }
    return err("Invalid request body", 400);
  }

  return withAuth(async (session) => {
    const [existing] = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.orgId, session.orgId)))
      .limit(1);

    if (!existing) return err("Lead not found", 404);

    const [updated] = await db
      .update(leads)
      .set({ customData: data.customData, updatedAt: new Date() })
      .where(and(eq(leads.id, leadId), eq(leads.orgId, session.orgId)))
      .returning();

    return ok({ customData: updated.customData });
  });
}
