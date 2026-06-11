import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { csatSurveys, csatResponses } from "@/lib/db/schema/crm";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

const postSchema = z.object({
  rating: z.number().int().min(1).max(10),
  comment: z.string().optional(),
  respondentName: z.string().optional(),
  respondentEmail: z.string().email().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> },
) {
  return withAuth(async (session) => {
    const { surveyId } = await params;
    const { limit } = parseQuery(req, listSchema);

    const survey = await db.query.csatSurveys.findFirst({
      where: and(
        eq(csatSurveys.id, Number(surveyId)),
        eq(csatSurveys.orgId, session.orgId),
      ),
      columns: { id: true },
    });
    if (!survey) return err("Survey not found", 404);

    const responses = await db.query.csatResponses.findMany({
      where: eq(csatResponses.surveyId, Number(surveyId)),
      orderBy: (t, { desc }) => [desc(t.submittedAt)],
      limit,
    });

    return ok(responses);
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> },
) {
  const { surveyId } = await params;

  const survey = await db.query.csatSurveys.findFirst({
    where: and(
      eq(csatSurveys.id, Number(surveyId)),
      eq(csatSurveys.status, "sent"),
    ),
    columns: { id: true, orgId: true, scaleMax: true },
  });

  if (!survey) {
    return err("Survey not found or not active", 404);
  }

  let body: z.infer<typeof postSchema>;
  try {
    body = await parseBody(req, postSchema);
  } catch {
    return err("Invalid request body", 400);
  }

  if (body.rating < 1 || body.rating > survey.scaleMax) {
    return err(`Rating must be between 1 and ${survey.scaleMax}`, 400);
  }

  await db.insert(csatResponses).values({
    surveyId: survey.id,
    orgId: survey.orgId,
    rating: body.rating,
    comment: body.comment ?? null,
    respondentName: body.respondentName ?? null,
    respondentEmail: body.respondentEmail ?? null,
  });

  return ok({ submitted: true });
}
