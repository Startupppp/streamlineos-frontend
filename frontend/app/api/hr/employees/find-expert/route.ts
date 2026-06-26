import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, organizationMembers, departments, departmentMembers } from "@/lib/db/schema";
import { employeeSkills, terminations } from "@/lib/db/schema";
import { eq, and, ilike, or, inArray, notInArray } from "drizzle-orm";
import { z } from "zod";

const querySchema = z.object({
  skill: z.string().min(1),
  department: z.string().optional(),
  role: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export interface ExpertResult {
  userId: string;
  name: string | null;
  image: string | null;
  designation: string | null;
  department: string | null;
  role: string | null;
  skills: { name: string; level: number }[];
  matchedSkill: string;
  matchedLevel: number;
}

function buildVariants(skill: string): string[] {
  const base = skill.trim().toLowerCase();
  const normalized = base.replace(/[.\s-]+/g, "");
  const withDots = base.replace(/\s+/g, ".");
  const variants = new Set([base, normalized, withDots]);
  return Array.from(variants);
}

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const q = parseQuery(req, querySchema);
    if (!q.skill) return err("skill query param is required", 400);

    const terminatedUserIds = await db
      .select({ userId: terminations.userId })
      .from(terminations)
      .where(and(
        eq(terminations.orgId, session.orgId),
        inArray(terminations.status, ["APPROVED", "COMPLETED", "SENT"]),
      ));

    const excludedIds = terminatedUserIds.map((t) => t.userId);

    const activeMembers = await db
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(and(
        eq(organizationMembers.orgId, session.orgId),
        eq(users.isActive, true),
        excludedIds.length > 0 ? notInArray(organizationMembers.userId, excludedIds) : undefined,
      ));

    if (activeMembers.length === 0) return ok([]);

    const activeMemberIds = activeMembers.map((m) => m.userId);

    const variants = buildVariants(q.skill);
    const skillConditions = variants.map((v) => ilike(employeeSkills.skillName, `%${v}%`));

    const matchingSkillRows = await db
      .select()
      .from(employeeSkills)
      .where(and(
        eq(employeeSkills.orgId, session.orgId),
        inArray(employeeSkills.userId, activeMemberIds),
        or(...skillConditions),
      ));

    if (matchingSkillRows.length === 0) return ok([]);

    const userIdSet = [...new Set(matchingSkillRows.map((r) => r.userId))];

    const userConditions = [
      eq(organizationMembers.orgId, session.orgId),
      inArray(organizationMembers.userId, userIdSet),
    ];
    if (q.role) userConditions.push(eq(organizationMembers.role, q.role));

    const memberRows = await db
      .select({
        userId: users.id,
        name: users.name,
        image: users.image,
        designation: users.designation,
        role: organizationMembers.role,
        departmentId: users.departmentId,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(and(...userConditions))
      .limit(q.limit);

    const memberMap = new Map(memberRows.map((m) => [m.userId, m]));

    let filteredUserIds = [...memberMap.keys()];

    if (q.department) {
      const deptRows = await db
        .select({ name: departments.name })
        .from(departments)
        .where(and(
          eq(departments.orgId, session.orgId),
          ilike(departments.name, `%${q.department}%`),
        ));

      if (deptRows.length === 0) return ok([]);

      const deptIds = await db
        .select({ departmentId: departments.id })
        .from(departments)
        .where(and(
          eq(departments.orgId, session.orgId),
          ilike(departments.name, `%${q.department}%`),
        ));

      const deptIdValues = deptIds.map((d) => d.departmentId);

      const deptMemberRows = await db
        .select({ userId: departmentMembers.userId })
        .from(departmentMembers)
        .where(inArray(departmentMembers.departmentId, deptIdValues));

      const deptUserSet = new Set(deptMemberRows.map((d) => d.userId));
      filteredUserIds = filteredUserIds.filter((id) => deptUserSet.has(id));

      if (filteredUserIds.length === 0) return ok([]);
    }

    const allSkillsForUsers = await db
      .select()
      .from(employeeSkills)
      .where(and(
        eq(employeeSkills.orgId, session.orgId),
        inArray(employeeSkills.userId, filteredUserIds),
      ));

    const skillsByUser = new Map<string, { name: string; level: number }[]>();
    for (const s of allSkillsForUsers) {
      if (!skillsByUser.has(s.userId)) skillsByUser.set(s.userId, []);
      skillsByUser.get(s.userId)!.push({ name: s.skillName, level: s.level ?? 1 });
    }

    const lowerVariants = variants.map((v) => v.toLowerCase());

    const expertList: ExpertResult[] = [];

    for (const userId of filteredUserIds) {
      const member = memberMap.get(userId);
      if (!member) continue;

      const userSkills = skillsByUser.get(userId) ?? [];
      const matchedSkills = userSkills.filter((s) =>
        lowerVariants.some((v) => s.name.toLowerCase().replace(/[.\s-]+/g, "").includes(v) || s.name.toLowerCase().includes(v)),
      );

      if (matchedSkills.length === 0) continue;

      const bestMatch = matchedSkills.reduce(
        (best, cur) => (cur.level > best.level ? cur : best),
        matchedSkills[0],
      );

      expertList.push({
        userId,
        name: member.name,
        image: member.image,
        designation: member.designation,
        department: null,
        role: member.role,
        skills: [...userSkills].sort((a, b) => b.level - a.level),
        matchedSkill: bestMatch.name,
        matchedLevel: bestMatch.level,
      });
    }

    const experts = expertList.sort((a, b) => b.matchedLevel - a.matchedLevel);

    return ok(experts);
  });
}
