import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { employeeSkills } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  userId: z.string().min(1).optional(),
  skillName: z.string().min(1).max(100),
  level: z.number().int().min(1).max(5).optional().default(1),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const userId = req.nextUrl.searchParams.get("userId");
    const conditions = [eq(employeeSkills.orgId, session.orgId)];
    if (userId) conditions.push(eq(employeeSkills.userId, userId));

    const data = await db.query.employeeSkills.findMany({
      where: and(...conditions),
      with: { user: true },
      orderBy: [desc(employeeSkills.createdAt)],
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = createSchema.parse(await req.json());
    const [skill] = await db.insert(employeeSkills).values({
      orgId: session.orgId,
      userId: body.userId ?? session.user.id,
      skillName: body.skillName,
      level: body.level,
    }).returning();
    return ok(skill, 201);
  });
}
