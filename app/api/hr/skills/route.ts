import { withAuth, ok, parseQuery, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { employeeSkills } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const listSchema = z.object({
  userId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const createSchema = z.object({
  userId: z.string().min(1).optional(),
  skillName: z.string().trim().min(2, "Skill name must be at least 2 characters").max(50, "Skill name must be at most 50 characters"),
  level: z.number().int().min(1).max(5).optional().default(1),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { userId, limit } = parseQuery(req, listSchema);
    const conditions = [eq(employeeSkills.orgId, session.orgId)];
    if (userId) conditions.push(eq(employeeSkills.userId, userId));

    const data = await db.query.employeeSkills.findMany({
      where: and(...conditions),
      with: { user: true },
      orderBy: [desc(employeeSkills.createdAt)],
      limit,
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createSchema);
    const [skill] = await db.insert(employeeSkills).values({
      orgId: session.orgId,
      userId: body.userId ?? session.user.id,
      skillName: body.skillName,
      level: body.level,
    }).returning();
    return ok(skill, 201);
  });
}
