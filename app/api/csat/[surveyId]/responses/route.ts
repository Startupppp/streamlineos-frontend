import { type NextRequest, NextResponse } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { csatSurveys, csatResponses } from "@/lib/db/schema/crm";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const postSchema = z.object({
  rating: z.number().int().min(1).max(10),
  comment: z.string().optional(),
  respondentName: z.string().optional(),
  respondentEmail: z.string().email().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  return withAuth(async (session) => {
    const { surveyId } = await params;

    const survey = await db.query.csatSurveys.findFirst({
      where: and(
        eq(csatSurveys.id, Number(surveyId)),
        eq(csatSurveys.orgId, session.orgId)
      ),
      columns: { id: true },
    });
    if (!survey) return err("Survey not found", 404);

    const responses = await db.query.csatResponses.findMany({
      where: eq(csatResponses.surveyId, Number(surveyId)),
      orderBy: (t, { desc }) => [desc(t.submittedAt)],
    });

    return ok(responses);
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  const { surveyId } = await params;

  const survey = await db.query.csatSurveys.findFirst({
    where: and(
      eq(csatSurveys.id, Number(surveyId)),
      eq(csatSurveys.status, "sent")
    ),
    columns: { id: true, orgId: true, scaleMax: true },
  });

  if (!survey) {
    return NextResponse.json(
      { error: "Survey not found or not active" },
      { status: 404 }
    );
  }

  let body: z.infer<typeof postSchema>;
  try {
    const raw = await req.json();
    body = postSchema.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.rating < 1 || body.rating > survey.scaleMax) {
    return NextResponse.json(
      { error: `Rating must be between 1 and ${survey.scaleMax}` },
      { status: 400 }
    );
  }

  await db.insert(csatResponses).values({
    surveyId: survey.id,
    orgId: survey.orgId,
    rating: body.rating,
    comment: body.comment ?? null,
    respondentName: body.respondentName ?? null,
    respondentEmail: body.respondentEmail ?? null,
  });

  return NextResponse.json({ success: true });
}
