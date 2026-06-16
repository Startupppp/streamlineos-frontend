import { withAbility, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { npsSurveys, npsResponses } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { npsBreakdown, npsScore, type NpsCategory } from "@/lib/services/nps";

const TREND_WINDOW = 50;

export async function GET() {
  return withAbility("read", "crm:clients", async (session) => {
    const activeSurveys = await db
      .select({ id: npsSurveys.id })
      .from(npsSurveys)
      .where(and(eq(npsSurveys.orgId, session.orgId), eq(npsSurveys.status, "active")));

    const activeIds = new Set(activeSurveys.map((s) => s.id));

    const recent = await db
      .select({
        category: npsResponses.category,
        surveyId: npsResponses.surveyId,
        createdAt: npsResponses.createdAt,
      })
      .from(npsResponses)
      .where(eq(npsResponses.orgId, session.orgId))
      .orderBy(desc(npsResponses.createdAt))
      .limit(TREND_WINDOW);

    const activeCategories = recent
      .filter((r) => activeIds.has(r.surveyId))
      .map((r) => r.category as NpsCategory);

    const breakdown = npsBreakdown(activeCategories);

    const trend = [...recent]
      .reverse()
      .map((r) => ({
        category: r.category as NpsCategory,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      }));

    return ok({
      activeSurveys: activeSurveys.length,
      breakdown,
      nps: npsScore(breakdown),
      trend,
    });
  });
}
