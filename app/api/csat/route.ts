import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { csatSurveys } from "@/lib/db/schema/crm";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  question: z.string().min(1).optional(),
  clientId: z.number().int().positive().optional(),
  scaleMax: z.union([z.literal(5), z.literal(10)]).optional().default(5),
});

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const surveys = await db.query.csatSurveys.findMany({
      where: eq(csatSurveys.orgId, session.orgId),
      with: {
        client: { columns: { id: true, name: true } },
        responses: { columns: { rating: true } },
      },
      orderBy: [desc(csatSurveys.createdAt)],
    });

    const transformed = surveys.map((s) => {
      const { responses, ...rest } = s;
      const responseCount = responses.length;
      const avgRating =
        responseCount > 0
          ? responses.reduce((sum, r) => sum + r.rating, 0) / responseCount
          : null;
      return { ...rest, responseCount, avgRating };
    });

    return ok(transformed);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createSchema);

    const [survey] = await db
      .insert(csatSurveys)
      .values({
        orgId: session.orgId,
        clientId: body.clientId ?? null,
        title: body.title,
        question: body.question ?? "How satisfied are you with our service?",
        scaleMax: body.scaleMax,
        status: "draft",
        publicToken: crypto.randomUUID(),
        createdBy: session.user.id,
      })
      .returning();

    return ok(survey, 201);
  });
}
