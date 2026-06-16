import { db } from "@/lib/db";
import { npsSurveys, npsResponses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { categoryForScore } from "@/lib/services/nps";

const submitSchema = z.object({
  score: z.number().int().min(0).max(10),
  comment: z.string().max(2000).optional(),
  name: z.string().max(200).optional(),
  email: z
    .union([z.string().email("Please enter a valid email address").max(320), z.literal("")])
    .optional(),
});

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;

  const [survey] = await db
    .select({
      title: npsSurveys.title,
      question: npsSurveys.question,
      status: npsSurveys.status,
    })
    .from(npsSurveys)
    .where(eq(npsSurveys.publicToken, token));

  if (!survey || survey.status !== "active") {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  return NextResponse.json({ survey });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params;

  const [survey] = await db
    .select({
      id: npsSurveys.id,
      orgId: npsSurveys.orgId,
      status: npsSurveys.status,
    })
    .from(npsSurveys)
    .where(eq(npsSurveys.publicToken, token));

  if (!survey || survey.status !== "active") {
    return NextResponse.json({ error: "Survey not found or no longer active" }, { status: 404 });
  }

  const parsed = submitSchema.safeParse(await req.json());
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid submission";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const input = parsed.data;
  const email = input.email && input.email.length > 0 ? input.email : null;

  await db.insert(npsResponses).values({
    orgId: survey.orgId,
    surveyId: survey.id,
    score: input.score,
    category: categoryForScore(input.score),
    comment: input.comment && input.comment.length > 0 ? input.comment : null,
    respondentName: input.name && input.name.length > 0 ? input.name : null,
    respondentEmail: email,
  });

  return NextResponse.json({ success: true });
}
