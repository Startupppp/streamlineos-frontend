import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { employeeSkills, organizationMembers, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { cached, CACHE_TTL } from "@/lib/cache";

/** GET /api/hr/employees/skills-matrix
 *  Returns { employees, skills, matrix } for the skills matrix view.
 */
export async function GET() {
  return withAuth(async (session) => {
    const data = await cached(
      `hr:skills-matrix:${session.orgId}`,
      async () => {
        const allSkills = await db.query.employeeSkills.findMany({
          where: eq(employeeSkills.orgId, session.orgId),
          with: { user: { columns: { id: true, name: true, image: true } } },
        });

        // Get active members
        const members = await db
          .select({
            userId: organizationMembers.userId,
            name: users.name,
            image: users.image,
          })
          .from(organizationMembers)
          .leftJoin(users, eq(users.id, organizationMembers.userId))
          .where(eq(organizationMembers.orgId, session.orgId))
          .limit(100);

        // Unique skill names (sorted)
        const skillNames = [...new Set(allSkills.map((s) => s.skillName))].sort();

        // Build per-employee skill map: { userId → { skillName → level } }
        const matrixMap = new Map<string, Map<string, number>>();
        for (const skill of allSkills) {
          if (!matrixMap.has(skill.userId)) matrixMap.set(skill.userId, new Map());
          matrixMap.get(skill.userId)!.set(skill.skillName, skill.level ?? 1);
        }

        const employeesWithSkills = members
          .filter((m) => matrixMap.has(m.userId))
          .map((m) => ({
            userId: m.userId,
            name: m.name,
            image: m.image,
            skills: Object.fromEntries(matrixMap.get(m.userId) ?? new Map()),
          }))
          .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

        return { employees: employeesWithSkills, skills: skillNames };
      },
      { ttlSeconds: CACHE_TTL.MEDIUM },
    );

    return ok(data);
  });
}
