"server-only";

import { db } from "@/lib/db";
import { projects, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export interface ProjectAccessDTO {
  id: number;
  name: string;
  key: string;
  orgId: string;
  managerId: string | null;
}

export async function getProjectAccessForUser(
  projectId: number,
  userId: string,
): Promise<ProjectAccessDTO | null> {
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      key: projects.key,
      orgId: projects.orgId,
      managerId: projects.managerId,
    })
    .from(projects)
    .innerJoin(organizationMembers, eq(organizationMembers.orgId, projects.orgId))
    .where(and(eq(projects.id, projectId), eq(organizationMembers.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}
