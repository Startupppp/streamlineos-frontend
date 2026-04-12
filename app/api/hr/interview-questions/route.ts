import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { interviewQuestions } from "@/lib/db/schema";
import { eq, and, ilike, or } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { z } from "zod";

const createSchema = z.object({
  question: z.string().min(1).max(1000),
  category: z.string().min(1).max(100).default("GENERAL"),
  role: z.string().max(100).optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  tags: z.array(z.string()).default([]),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const role = searchParams.get("role");
    const difficulty = searchParams.get("difficulty");
    const q = searchParams.get("q");

    const conditions = [
      eq(interviewQuestions.orgId, session.orgId),
      eq(interviewQuestions.isActive, true),
    ];

    if (category) conditions.push(eq(interviewQuestions.category, category));
    if (role) conditions.push(eq(interviewQuestions.role, role));
    if (difficulty) conditions.push(eq(interviewQuestions.difficulty, difficulty));
    if (q) conditions.push(ilike(interviewQuestions.question, `%${q}%`));

    const questions = await db.query.interviewQuestions.findMany({
      where: and(...conditions),
      orderBy: (t, { asc }) => [asc(t.category), asc(t.createdAt)],
      limit: 200,
    });

    return ok(questions);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only Admin or HR can manage question bank", 403);
    }

    const input = await parseBody(req, createSchema);

    const [created] = await db
      .insert(interviewQuestions)
      .values({
        orgId: session.orgId,
        question: input.question,
        category: input.category,
        role: input.role ?? null,
        difficulty: input.difficulty,
        tags: input.tags,
        createdBy: session.user.id,
      })
      .returning();

    return ok(created, 201);
  });
}
