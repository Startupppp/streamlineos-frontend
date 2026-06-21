import { type NextRequest } from "next/server";
import { withAbility, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { npsSurveys, npsResponses } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { nanoid } from "nanoid";
import { npsScore } from "@/lib/services/nps";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  question: z.string().min(1).max(500),
});

export async function GET() {
  return withAbility("read", "crm:clients", async (session) => {
    const surveys = await db
      .select()
      .from(npsSurveys)
      .where(eq(npsSurveys.orgId, session.orgId))
      .orderBy(desc(npsSurveys.createdAt));

    const counts = await db
      .select({
        surveyId: npsResponses.surveyId,
        category: npsResponses.category,
        count: sql<number>`count(*)::int`,
      })
      .from(npsResponses)
      .where(eq(npsResponses.orgId, session.orgId))
      .groupBy(npsResponses.surveyId, npsResponses.category);

    const tally = new Map<number, { promoters: number; passives: number; detractors: number; total: number }>();
    for (const row of counts) {
      const entry = tally.get(row.surveyId) ?? { promoters: 0, passives: 0, detractors: 0, total: 0 };
      if (row.category === "promoter") entry.promoters += row.count;
      else if (row.category === "passive") entry.passives += row.count;
      else entry.detractors += row.count;
      entry.total += row.count;
      tally.set(row.surveyId, entry);
    }

    const items = surveys.map((survey) => {
      const breakdown = tally.get(survey.id) ?? { promoters: 0, passives: 0, detractors: 0, total: 0 };
      return {
        ...survey,
        responseCount: breakdown.total,
        promoters: breakdown.promoters,
        passives: breakdown.passives,
        detractors: breakdown.detractors,
        nps: npsScore(breakdown),
      };
    });

    return ok(items);
  });
}

export async function POST(req: NextRequest) {
  return withAbility("manage", "crm:clients", async (session) => {
    const input = await parseBody(req, createSchema);

    const [survey] = await db
      .insert(npsSurveys)
      .values({
        orgId: session.orgId,
        title: input.title,
        question: input.question,
        publicToken: nanoid(24),
        createdBy: session.user.id,
      })
      .returning();

    return ok(
      {
        ...survey,
        responseCount: 0,
        promoters: 0,
        passives: 0,
        detractors: 0,
        nps: 0,
      },
      201,
    );
  });
}
