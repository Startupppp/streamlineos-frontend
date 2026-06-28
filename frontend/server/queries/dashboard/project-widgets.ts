"server-only";

import { db } from "@/lib/db";
import { getSessionAbility } from "@/lib/abilities-server";
import {
  projects,
  projectMembers,
  tickets,
} from "@/lib/db/schema";
import { eq, and, desc, or, inArray } from "drizzle-orm";
import { serverApiClient } from "@/lib/api/server-client";
import type { RecentProject, SprintSummary } from "@/types/dashboard";

export async function getRecentProjects(orgId: string, userId: string, role?: string | null): Promise<RecentProject[]> {
  return serverApiClient.get<RecentProject[]>("/dashboard/recent-projects");
}

export async function getMyIssues(orgId: string, userId: string) {
  return db.query.tickets.findMany({
    where: and(
      eq(tickets.orgId, orgId),
      eq(tickets.assigneeId, userId)
    ),
    orderBy: [desc(tickets.updatedAt)],
    limit: 10,
    with: {
      project: {
        columns: { id: true, name: true, key: true },
      },
      assignee: {
        columns: { id: true, firstName: true, lastName: true, image: true },
      },
    },
  });
}

export async function getActiveSprintSummary(orgId: string, userId: string, role?: string | null): Promise<SprintSummary | null> {
  return serverApiClient.get<SprintSummary | null>("/dashboard/active-sprint");
}

export async function getRecentActivity(orgId: string, userId: string, role?: string | null) {
  const ability = await getSessionAbility();

  const isOwnerOrAdmin = ability.can("manage", "hr:employees");

  let projectIds: number[];
  if (isOwnerOrAdmin) {
    const allProjects = await db.query.projects.findMany({
      where: eq(projects.orgId, orgId),
      columns: { id: true },
    });
    projectIds = allProjects.map((p) => p.id);
  } else {
    const memberOf = await db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, userId));
    projectIds = memberOf.map((m) => m.projectId);
  }

  if (projectIds.length === 0) return [];

  const ticketFilters = [
    eq(tickets.orgId, orgId),
    inArray(tickets.projectId, projectIds),
  ];

  if (!isOwnerOrAdmin) {
    ticketFilters.push(
      or(
        eq(tickets.assigneeId, userId),
        eq(tickets.reporterId, userId)
      )!
    );
  }

  const recentTickets = await db.query.tickets.findMany({
    where: and(...ticketFilters),
    orderBy: [desc(tickets.updatedAt)],
    limit: 10,
    with: {
      project: {
        columns: { id: true, name: true, key: true },
      },
      assignee: {
        columns: { id: true, firstName: true, lastName: true, image: true },
      },
    },
  });

  return recentTickets.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    type: t.type,
    priority: t.priority,
    ticketNumber: t.ticketNumber,
    updatedAt: t.updatedAt,
    projectName: t.project?.name || "",
    projectId: t.project?.id,
    projectKey: t.project?.key || "",
    assignee: t.assignee
      ? {
          id: t.assignee.id,
          firstName: t.assignee.firstName,
          lastName: t.assignee.lastName,
          image: t.assignee.image,
        }
      : null,
  }));
}
