"server-only";

import { db } from "@/lib/db";
import {
  projects,
  tickets,
  timesheets,
  projectMembers,
  ticketLabels,
  users,
  organizationMembers,
  cycles,
  modules,
  pages,
  projectViews,
  intakeItems,
  customStates,
  projectStatuses,
} from "@/lib/db/schema";
import { eq, and, desc, asc, sql, gte, count, or } from "drizzle-orm";
import { cached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import type { ProjectFilters } from "@/types/projects";

export async function getProjects(orgId: string, filters?: ProjectFilters) {
  const conditions = [eq(projects.orgId, orgId)];

  if (filters?.search) {
    conditions.push(
      or(
        sql`${projects.name} ILIKE ${"%" + filters.search + "%"}`,
        sql`${projects.key} ILIKE ${"%" + filters.search + "%"}`
      )!
    );
  }

  if (filters?.status && filters.status !== "ALL") {
    conditions.push(eq(projects.status, filters.status as "ACTIVE" | "COMPLETED" | "ARCHIVED"));
  }

  return db.query.projects.findMany({
    where: and(...conditions),
    orderBy: [desc(projects.id)],
  });
}

export async function getProject(orgId: string, id: number) {
  return db.query.projects.findFirst({
    where: and(eq(projects.id, id), eq(projects.orgId, orgId)),
    with: {
      statuses: {
        orderBy: [asc(projectStatuses.order)],
      },
      members: {
        with: { user: true },
      },
      tickets: {
        with: {
          assignee: true,
          reporter: true,
          assignees: { with: { user: true } },
          comments: { with: { user: true } },
          attachments: true,
          labels: { with: { label: true } },
        },
      },
    },
  });
}

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

export async function getProjectMembers(projectId: number) {
  return db
    .select({
      id: users.id,
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      image: users.image,
      email: users.email,
      role: projectMembers.role,
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, projectId));
}

export async function getOrgMembersForProject(orgId: string) {
  return cached(
    CACHE_KEYS.orgMembers(orgId),
    () =>
      db
        .select({
          id: users.id,
          name: users.name,
          firstName: users.firstName,
          lastName: users.lastName,
          image: users.image,
          email: users.email,
          role: organizationMembers.role,
        })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(
          and(
            eq(organizationMembers.orgId, orgId),
            eq(users.isActive, true)
          )
        ),
    { ttlSeconds: CACHE_TTL.MEDIUM },
  );
}

export async function getProjectLabels(orgId: string) {
  return cached(
    CACHE_KEYS.projectLabels(orgId),
    () =>
      db.query.ticketLabels.findMany({
        where: eq(ticketLabels.orgId, orgId),
        orderBy: [desc(ticketLabels.createdAt)],
      }),
    { ttlSeconds: CACHE_TTL.LONG },
  );
}

export async function getProjectAnalytics(orgId: string, projectId: number) {
  const orgFilter = and(
    eq(tickets.projectId, projectId),
    eq(tickets.orgId, orgId)
  );

  const [stateDistribution, priorityBreakdown, assigneeCompletion] = await Promise.all([
    db
      .select({ status: tickets.status, count: count() })
      .from(tickets)
      .where(orgFilter)
      .groupBy(tickets.status),
    db
      .select({ priority: tickets.priority, count: count() })
      .from(tickets)
      .where(orgFilter)
      .groupBy(tickets.priority),
    db
      .select({
        assigneeId: tickets.assigneeId,
        total: count(),
        completed: count(sql`CASE WHEN ${tickets.status} = 'DONE' THEN 1 END`),
      })
      .from(tickets)
      .where(and(orgFilter, sql`${tickets.assigneeId} IS NOT NULL`))
      .groupBy(tickets.assigneeId),
  ]);

  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

  const [volumeOverTime, cycleVelocity, estimateVsActual] = await Promise.all([
    db
      .select({
        week: sql<string>`TO_CHAR(DATE_TRUNC('week', ${tickets.createdAt}), 'YYYY-MM-DD')`,
        count: count(),
      })
      .from(tickets)
      .where(and(orgFilter, gte(tickets.createdAt, twelveWeeksAgo)))
      .groupBy(sql`DATE_TRUNC('week', ${tickets.createdAt})`)
      .orderBy(sql`DATE_TRUNC('week', ${tickets.createdAt})`),
    db
      .select({
        cycleId: cycles.id,
        cycleName: cycles.name,
        completedPoints: sql<number>`COALESCE(SUM(CASE WHEN ${tickets.status} = 'DONE' THEN COALESCE(${tickets.storyPoints}, ${tickets.estimate}, 0) ELSE 0 END), 0)`,
      })
      .from(cycles)
      .leftJoin(tickets, eq(tickets.cycleId, cycles.id))
      .where(and(eq(cycles.projectId, projectId), eq(cycles.orgId, orgId)))
      .groupBy(cycles.id, cycles.name)
      .orderBy(cycles.startDate),
    db
      .select({
        ticketId: tickets.id,
        title: tickets.title,
        estimated: tickets.originalEstimate,
        actual: sql<number>`COALESCE(SUM(${timesheets.hours}), 0)`,
      })
      .from(tickets)
      .leftJoin(timesheets, eq(timesheets.ticketId, tickets.id))
      .where(and(orgFilter, sql`${tickets.originalEstimate} IS NOT NULL`))
      .groupBy(tickets.id, tickets.title, tickets.originalEstimate)
      .limit(50),
  ]);

  const today = new Date();
  const totalTickets = stateDistribution.reduce((s, r) => s + Number(r.count), 0);
  const doneTickets = stateDistribution
    .filter((r) => r.status === "DONE")
    .reduce((s, r) => s + Number(r.count), 0);
  const completionRate = totalTickets > 0 ? doneTickets / totalTickets : 0;

  const [overdueResult] = await db
    .select({ count: count() })
    .from(tickets)
    .where(
      and(
        orgFilter,
        sql`${tickets.status} NOT IN ('DONE', 'CANCELLED')`,
        sql`${tickets.dueDate} IS NOT NULL`,
        sql`${tickets.dueDate} < ${today.toISOString().slice(0, 10)}`,
      ),
    );
  const openTickets = stateDistribution
    .filter((r) => !["DONE", "CANCELLED"].includes(r.status))
    .reduce((s, r) => s + Number(r.count), 0);
  const overdueCount = Number(overdueResult?.count ?? 0);
  const onTimeRate = openTickets > 0 ? 1 - overdueCount / openTickets : 1;

  const velocities = cycleVelocity.map((c) => Number(c.completedPoints));
  const avgVelocity = velocities.length > 0 ? velocities.reduce((a, b) => a + b, 0) / velocities.length : 0;
  const latestVelocity = velocities.length > 0 ? velocities[velocities.length - 1] : 0;
  const velocityScore = avgVelocity > 0 ? Math.min(1, latestVelocity / avgVelocity) : 1;

  const healthScore = Math.round(
    completionRate * 50 + onTimeRate * 30 + velocityScore * 20,
  );

  const healthStatus: "EXCELLENT" | "GOOD" | "AT_RISK" | "CRITICAL" =
    healthScore >= 80 ? "EXCELLENT"
    : healthScore >= 60 ? "GOOD"
    : healthScore >= 40 ? "AT_RISK"
    : "CRITICAL";

  return {
    stateDistribution,
    priorityBreakdown,
    assigneeCompletion,
    volumeOverTime,
    cycleVelocity,
    estimateVsActual,
    healthScore,
    healthStatus,
    healthBreakdown: {
      completionPct: Math.round(completionRate * 100),
      onTimePct: Math.round(onTimeRate * 100),
      velocityScore: Math.round(velocityScore * 100),
      overdueTickets: overdueCount,
      totalTickets,
    },
  };
}

export async function getEpics(orgId: string, projectId: number) {
  return db.query.tickets.findMany({
    where: and(
      eq(tickets.orgId, orgId),
      eq(tickets.projectId, projectId),
      eq(tickets.type, "EPIC")
    ),
    with: { assignee: true },
    orderBy: [desc(tickets.createdAt)],
  });
}

export async function getCycles(orgId: string, projectId: number, status?: string) {
  const conditions = [
    eq(cycles.projectId, projectId),
    eq(cycles.orgId, orgId),
  ];
  if (status) {
    conditions.push(eq(cycles.status, status as "draft" | "active" | "completed"));
  }
  return db
    .select()
    .from(cycles)
    .where(and(...conditions))
    .orderBy(cycles.startDate);
}

export async function getModules(orgId: string, projectId: number) {
  return db
    .select()
    .from(modules)
    .where(and(eq(modules.projectId, projectId), eq(modules.orgId, orgId)))
    .orderBy(modules.name);
}

export async function getPages(orgId: string, projectId: number) {
  return db
    .select()
    .from(pages)
    .where(and(eq(pages.projectId, projectId), eq(pages.orgId, orgId)))
    .orderBy(asc(pages.title));
}

export async function getViews(orgId: string, projectId: number) {
  return db
    .select()
    .from(projectViews)
    .where(
      and(eq(projectViews.projectId, projectId), eq(projectViews.orgId, orgId))
    )
    .orderBy(desc(projectViews.isPinned), projectViews.name);
}

export async function getIntakeRequests(
  orgId: string,
  projectId: number,
  status?: string
) {
  const conditions = [
    eq(intakeItems.projectId, projectId),
    eq(intakeItems.orgId, orgId),
  ];
  if (status) {
    conditions.push(
      eq(intakeItems.status, status as "pending" | "accepted" | "declined" | "duplicate")
    );
  }
  return db
    .select()
    .from(intakeItems)
    .where(and(...conditions))
    .orderBy(desc(intakeItems.createdAt));
}

export async function getCustomStates(orgId: string, projectId: number) {
  return cached(
    CACHE_KEYS.customStates(orgId, projectId),
    () =>
      db
        .select()
        .from(customStates)
        .where(
          and(eq(customStates.projectId, projectId), eq(customStates.orgId, orgId))
        )
        .orderBy(customStates.sequence),
    { ttlSeconds: CACHE_TTL.LONG },
  );
}
