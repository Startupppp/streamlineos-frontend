import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projects, tickets, ticketAssignees, users } from "@/lib/db/schema";
import { eq, and, inArray, count, sql } from "drizzle-orm";

export async function GET() {
  return withAuth(async (session) => {
    const activeProjects = await db.query.projects.findMany({
      where: and(eq(projects.orgId, session.orgId), eq(projects.status, "ACTIVE")),
      columns: { id: true, name: true, key: true },
    });

    if (activeProjects.length === 0) return ok([]);

    const projectIds = activeProjects.map((p) => p.id);

    const [primaryAllocation, multiAllocation] = await Promise.all([
      db
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
        .groupBy(tickets.assigneeId, tickets.projectId),
      db
        .select({
          assigneeId: ticketAssignees.userId,
          projectId: tickets.projectId,
          open: count(tickets.id),
        })
        .from(ticketAssignees)
        .innerJoin(tickets, eq(ticketAssignees.ticketId, tickets.id))
        .where(
          and(
            eq(tickets.orgId, session.orgId),
            inArray(tickets.projectId, projectIds),
            sql`${tickets.status} NOT IN ('DONE', 'CANCELLED', 'CLOSED')`,
          ),
        )
        .groupBy(ticketAssignees.userId, tickets.projectId),
    ]);

    const allAssigneeIds = new Set<string>();
    for (const r of primaryAllocation) {
      if (r.assigneeId) allAssigneeIds.add(r.assigneeId);
    }
    for (const r of multiAllocation) {
      if (r.assigneeId) allAssigneeIds.add(r.assigneeId);
    }

    if (allAssigneeIds.size === 0) return ok([]);

    const members = await db.query.users.findMany({
      where: inArray(users.id, [...allAssigneeIds]),
      columns: { id: true, name: true, email: true, image: true },
    });

    const memberMap = new Map(members.map((m) => [m.id, m]));
    const projectMap = new Map(activeProjects.map((p) => [p.id, p]));

    const byMember = new Map<string, {
      user: { id: string; name: string | null; email: string; image: string | null };
      totalOpen: number;
      byProject: { projectId: number; projectName: string; projectKey: string; open: number }[];
    }>();

    const addAllocation = (assigneeId: string | null, projectId: number | null, openCount: number) => {
      if (!assigneeId) return;
      const user = memberMap.get(assigneeId);
      if (!user) return;
      const project = projectId ? projectMap.get(projectId) : undefined;
      if (!project) return;

      if (!byMember.has(assigneeId)) {
        byMember.set(assigneeId, { user, totalOpen: 0, byProject: [] });
      }
      const entry = byMember.get(assigneeId)!;
      const existing = entry.byProject.find((p) => p.projectId === project.id);
      if (existing) {
        existing.open = Math.max(existing.open, openCount);
      } else {
        entry.byProject.push({
          projectId: project.id,
          projectName: project.name,
          projectKey: project.key,
          open: openCount,
        });
      }
      entry.totalOpen = entry.byProject.reduce((s, p) => s + p.open, 0);
    };

    for (const row of primaryAllocation) {
      addAllocation(row.assigneeId, row.projectId, Number(row.open));
    }
    for (const row of multiAllocation) {
      addAllocation(row.assigneeId, row.projectId, Number(row.open));
    }

    const result = [...byMember.values()].sort((a, b) => b.totalOpen - a.totalOpen);
    return ok(result);
  });
}
