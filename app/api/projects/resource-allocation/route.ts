import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projects, projectMembers, tickets, users } from "@/lib/db/schema";
import { eq, and, inArray, count, sql } from "drizzle-orm";

/** GET /api/projects/resource-allocation
 *  Returns per-member ticket allocation across all active projects.
 */
export async function GET() {
  return withAuth(async (session) => {
    // Get all active projects in this org
    const activeProjects = await db.query.projects.findMany({
      where: and(eq(projects.orgId, session.orgId), eq(projects.status, "ACTIVE")),
      columns: { id: true, name: true, key: true },
    });

    if (activeProjects.length === 0) return ok([]);

    const projectIds = activeProjects.map((p) => p.id);

    // Get ticket counts per assignee per project (open tickets only)
    const allocation = await db
      .select({
        assigneeId: tickets.assigneeId,
        projectId: tickets.projectId,
        open: count(tickets.id),
      })
      .from(tickets)
      .where(
        and(
          eq(tickets.orgId, session.orgId),
          inArray(tickets.projectId, projectIds),
          sql`${tickets.status} NOT IN ('DONE', 'CANCELLED', 'CLOSED')`,
        ),
      )
      .groupBy(tickets.assigneeId, tickets.projectId);

    // Get unique assignee IDs
    const assigneeIds = [...new Set(
      allocation.map((a) => a.assigneeId).filter((id): id is string => id !== null),
    )];

    if (assigneeIds.length === 0) return ok([]);

    // Fetch user details
    const members = await db.query.users.findMany({
      where: inArray(users.id, assigneeIds),
      columns: { id: true, name: true, email: true, image: true },
    });

    const memberMap = new Map(members.map((m) => [m.id, m]));
    const projectMap = new Map(activeProjects.map((p) => [p.id, p]));

    // Build per-member summary
    const byMember = new Map<string, {
      user: { id: string; name: string | null; email: string; image: string | null };
      totalOpen: number;
      byProject: { projectId: number; projectName: string; projectKey: string; open: number }[];
    }>();

    for (const row of allocation) {
      if (!row.assigneeId) continue;
      const user = memberMap.get(row.assigneeId);
      if (!user) continue;
      const project = row.projectId ? projectMap.get(row.projectId) : undefined;
      if (!project) continue;

      if (!byMember.has(row.assigneeId)) {
        byMember.set(row.assigneeId, { user, totalOpen: 0, byProject: [] });
      }
      const entry = byMember.get(row.assigneeId)!;
      entry.totalOpen += Number(row.open);
      entry.byProject.push({
        projectId: project.id,
        projectName: project.name,
        projectKey: project.key,
        open: Number(row.open),
      });
    }

    const result = [...byMember.values()].sort((a, b) => b.totalOpen - a.totalOpen);
    return ok(result);
  });
}
