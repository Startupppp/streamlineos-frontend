import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { interviewQuestions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionAbility } from "@/lib/abilities-server";
import { z } from "zod";

const updateSchema = z.object({
  question: z.string().min(1).max(1000).optional(),
  category: z.string().min(1).max(100).optional(),
  role: z.string().max(100).nullable().optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

type RouteParams = { params: Promise<{ questionId: string }> };

async function getQuestion(orgId: string, questionId: number) {
  return db.query.interviewQuestions.findFirst({
    where: and(eq(interviewQuestions.id, questionId), eq(interviewQuestions.orgId, orgId)),
  });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (!ability.can("manage", "hr:employees")) {
      return err("Only Admin or HR can manage question bank", 403);
    }

    const { questionId: id } = await params;
    const questionId = Number(id);
    if (!Number.isFinite(questionId)) return err("Invalid ID", 400);

    const existing = await getQuestion(session.orgId, questionId);
    if (!existing) return err("Question not found", 404);

    const input = await parseBody(req, updateSchema);

    await db
      .update(interviewQuestions)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(interviewQuestions.id, questionId), eq(interviewQuestions.orgId, session.orgId)));

    return ok({ success: true });
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (!ability.can("manage", "hr:employees")) {
      return err("Only Admin or HR can manage question bank", 403);
    }

    const { questionId: id } = await params;
    const questionId = Number(id);
    if (!Number.isFinite(questionId)) return err("Invalid ID", 400);

    await db
      .update(interviewQuestions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(interviewQuestions.id, questionId), eq(interviewQuestions.orgId, session.orgId)));

    return ok({ success: true });
  });
}
