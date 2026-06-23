import { withAuth, ok, err } from "@/lib/api/helpers";
import { getSessionAbility } from "@/lib/abilities-server";
import { db } from "@/lib/db";
import { skillAssessments, assessmentAttempts } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const questionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  options: z.array(z.string()).min(2),
  correctIndex: z.number().int().min(0),
});

const createSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  skillName: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  durationMinutes: z.number().int().positive().max(480).optional(),
  questions: z.preprocess((v) => (v == null ? [] : v), z.array(questionSchema)).optional().default([]),
  passingScore: z.number().int().min(0).max(100).optional().default(70),
  timeLimit: z.number().int().positive().optional(),
});

const submitSchema = z.object({
  assessmentId: z.number().int().positive(),
  answers: z.array(z.object({
    questionId: z.string().min(1),
    selectedIndex: z.number().int().min(0),
  })),
});

export async function GET() {
  return withAuth(async (session) => {
    const data = await db.query.skillAssessments.findMany({
      where: eq(skillAssessments.orgId, session.orgId),
      with: { attempts: true },
      orderBy: [desc(skillAssessments.createdAt)],
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const action = req.headers.get("x-action");

    if (action === "submit") {
      const body = submitSchema.parse(await req.json());
      const assessment = await db.query.skillAssessments.findFirst({
        where: and(eq(skillAssessments.id, body.assessmentId), eq(skillAssessments.orgId, session.orgId)),
      });
      if (!assessment) return err("Assessment not found.", 404);

      const questions = assessment.questions ?? [];
      let correct = 0;
      for (const answer of body.answers) {
        const q = questions.find((q) => q.id === answer.questionId);
        if (q && q.correctIndex === answer.selectedIndex) correct++;
      }
      const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
      const passed = score >= (assessment.passingScore ?? 70);

      const [attempt] = await db.insert(assessmentAttempts).values({
        assessmentId: body.assessmentId,
        userId: session.user.id,
        answers: body.answers,
        score,
        passed,
      }).returning();

      return ok({ ...attempt, score, passed, correct, total: questions.length }, 201);
    }

    const ability = await getSessionAbility();


    if (!ability.can("manage", "hr:performance"))  return err("Only admins can create assessments.", 403);
    const body = createSchema.parse(await req.json());
    const [assessment] = await db.insert(skillAssessments).values({
      orgId: session.orgId,
      title: body.title,
      skillName: body.skillName ?? body.category ?? "",
      questions: body.questions ?? [],
      passingScore: body.passingScore,
      timeLimit: body.durationMinutes ?? body.timeLimit,
      createdBy: session.user.id,
    }).returning();

    return ok(assessment, 201);
  });
}
