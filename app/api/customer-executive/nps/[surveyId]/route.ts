import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { npsSurveys, npsResponses } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { npsBreakdown, npsScore, type NpsCategory } from "@/lib/services/nps";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  question: z.string().min(1).max(500).optional(),
  status: z.enum(["draft", "active", "closed"]).optional(),
});

type RouteContext = { params: Promise<{ surveyId: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  return withAbility("read", "crm:clients", async (session) => {
    const { surveyId: idStr } = await ctx.params;
    const surveyId = Number(idStr);
    if (!Number.isFinite(surveyId)) return err("Invalid survey ID", 400);

    const survey = await db.query.npsSurveys.findFirst({
      where: and(eq(npsSurveys.id, surveyId), eq(npsSurveys.orgId, session.orgId)),
    });
    if (!survey) return err("Survey not found", 404);

    const responses = await db
      .select()
      .from(npsResponses)
      .where(and(eq(npsResponses.surveyId, surveyId), eq(npsResponses.orgId, session.orgId)))
      .orderBy(desc(npsResponses.createdAt));

    const breakdown = npsBreakdown(responses.map((r) => r.category as NpsCategory));

    return ok({
      survey,
      responses,
      breakdown,
      nps: npsScore(breakdown),
    });
  });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "crm:clients", async (session) => {
    const { surveyId: idStr } = await ctx.params;
    const surveyId = Number(idStr);
    if (!Number.isFinite(surveyId)) return err("Invalid survey ID", 400);

    const input = await parseBody(req, updateSchema);

    const [updated] = await db
      .update(npsSurveys)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(npsSurveys.id, surveyId), eq(npsSurveys.orgId, session.orgId)))
      .returning();

    if (!updated) return err("Survey not found", 404);
    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "crm:clients", async (session) => {
    const { surveyId: idStr } = await ctx.params;
    const surveyId = Number(idStr);
    if (!Number.isFinite(surveyId)) return err("Invalid survey ID", 400);

    const [deleted] = await db
      .delete(npsSurveys)
      .where(and(eq(npsSurveys.id, surveyId), eq(npsSurveys.orgId, session.orgId)))
      .returning();

    if (!deleted) return err("Survey not found", 404);
    return ok({ success: true });
  });
}
