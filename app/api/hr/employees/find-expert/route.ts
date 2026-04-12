import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, organizationMembers } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

const querySchema = z.object({
  skill: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export interface ExpertResult {
  userId: string;
  name: string | null;
  image: string | null;
  designation: string | null;
  skills: string[];
  matchedSkill: string;
}

export async function GET(req: NextRequest) {
  return withAuth<ExpertResult[]>(async (session) => {
    const q = parseQuery(req, querySchema);
    if (!q.skill) return err("skill query param is required", 400);

    const lowerSkill = q.skill.toLowerCase();

    // Find org members whose skills array contains the skill (case-insensitive)
    const results = await db
      .select({
        userId: users.id,
        name: users.name,
        image: users.image,
        designation: users.designation,
        skills: users.skills,
      })
      .from(users)
      .innerJoin(organizationMembers, eq(organizationMembers.userId, users.id))
      .where(
        and(
          eq(organizationMembers.orgId, session.orgId),
          eq(users.isActive, true),
          // PostgreSQL array containment: any element ilike skill
          sql`EXISTS (
            SELECT 1 FROM unnest(${users.skills}) AS s
            WHERE lower(s) LIKE ${"%" + lowerSkill + "%"}
          )`,
        ),
      )
      .limit(q.limit);

    const experts: ExpertResult[] = results.map((r) => ({
      userId: r.userId,
      name: r.name,
      image: r.image,
      designation: r.designation,
      skills: r.skills ?? [],
      matchedSkill: (r.skills ?? []).find((s) => s.toLowerCase().includes(lowerSkill)) ?? q.skill,
    }));

    return ok(experts);
  });
}
