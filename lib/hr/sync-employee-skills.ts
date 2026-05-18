import { db } from "@/lib/db";
import { employeeSkills } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

/** Sync comma-separated or array skills from user profile into employee_skills for the skills matrix. */
export async function syncEmployeeSkillsFromProfile(
  orgId: string,
  userId: string,
  skillsInput: string | string[] | null | undefined,
): Promise<void> {
  const raw =
    typeof skillsInput === "string"
      ? skillsInput.split(",")
      : Array.isArray(skillsInput)
        ? skillsInput
        : [];

  const names = [
    ...new Set(
      raw
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length <= 100),
    ),
  ];

  if (names.length === 0) return;

  const existing = await db.query.employeeSkills.findMany({
    where: and(eq(employeeSkills.orgId, orgId), eq(employeeSkills.userId, userId)),
    columns: { skillName: true },
  });
  const existingSet = new Set(existing.map((e) => e.skillName.toLowerCase()));

  const toInsert = names.filter((n) => !existingSet.has(n.toLowerCase()));
  if (toInsert.length === 0) return;

  await db.insert(employeeSkills).values(
    toInsert.map((skillName) => ({
      orgId,
      userId,
      skillName,
      level: 1,
    })),
  );
}
