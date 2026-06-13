import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { interviewQuestions } from "@/lib/db/schema";
import { eq, and, ilike, sql, desc } from "drizzle-orm";
import { getSessionAbility } from "@/lib/abilities-server";
import { z } from "zod";

const createSchema = z.object({
  question: z.string().min(1).max(1000),
  category: z.string().min(1).max(100).default("GENERAL"),
  role: z.string().max(100).optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  tags: z.array(z.string()).default([]),
  sampleAnswer: z.string().max(3000).optional(),
  keywords: z.array(z.string().max(100)).default([]),
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
      orderBy: [desc(interviewQuestions.createdAt)],
      limit: 200,
    });

    return ok(questions);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (!ability.can("manage", "hr:employees")) {
      return err("Only Admin or HR can manage question bank", 403);
    }

    const input = await parseBody(req, createSchema);

    const existing = await db.query.interviewQuestions.findFirst({
      where: and(
        eq(interviewQuestions.orgId, session.orgId),
        eq(interviewQuestions.isActive, true),
        sql`lower(trim(${interviewQuestions.question})) = ${input.question.trim().toLowerCase()}`,
      ),
      columns: { id: true },
    });
    if (existing) return err("A question with this text already exists in the bank.", 409);

    const dedupedTags = [...new Set(input.tags.map((t) => t.toLowerCase().trim()).filter(Boolean))];
    const dedupedKeywords = [...new Set((input.keywords ?? []).map((k) => k.toLowerCase().trim()).filter(Boolean))];

    const [created] = await db
      .insert(interviewQuestions)
      .values({
        orgId: session.orgId,
        question: input.question,
        category: input.category,
        role: input.role ?? null,
        difficulty: input.difficulty,
        tags: dedupedTags,
        sampleAnswer: input.sampleAnswer ?? null,
        keywords: dedupedKeywords,
        createdBy: session.user.id,
      })
      .returning();

    return ok(created, 201);
  });
}
