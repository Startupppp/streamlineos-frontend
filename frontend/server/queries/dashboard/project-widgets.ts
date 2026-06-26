"server-only";

import { db } from "@/lib/db";
import { getSessionAbility } from "@/lib/abilities-server";
import {
  projects,
  projectMembers,
  sprints,
  tickets,
} from "@/lib/db/schema";
import { eq, and, desc, or, inArray } from "drizzle-orm";

export async function getRecentProjects(orgId: string, userId: string, role?: string | null) {
  const ability = await getSessionAbility();

  const isOwnerOrAdmin = ability.can("manage", "hr:employees");

  if (isOwnerOrAdmin) {
    return db.query.projects.findMany({
      where: eq(projects.orgId, orgId),
      orderBy: [desc(projects.id)],
      limit: 5,
      with: {
        manager: {
          columns: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            image: true,
          },
        },
      },
    });
  }

  const memberOf = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId));

  const projectIds = memberOf.map((m) => m.projectId);

  return db.query.projects.findMany({
    where: and(
      eq(projects.orgId, orgId),
      or(
        eq(projects.managerId, userId),
        projectIds.length > 0 ? inArray(projects.id, projectIds) : undefined
      )
    ),
    orderBy: [desc(projects.id)],
    limit: 5,
    with: {
      manager: {
        columns: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          image: true,
        },
      },
    },
  });
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

export async function getActiveSprintSummary(orgId: string, userId: string, role?: string | null) {
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

  if (projectIds.length === 0) return null;

  const activeSprint = await db.query.sprints.findFirst({
    where: and(
      eq(sprints.orgId, orgId),
      eq(sprints.status, "ACTIVE"),
      inArray(sprints.projectId, projectIds)
    ),
    with: {
      project: {
        columns: { id: true, name: true },
      },
      tickets: {
        columns: { id: true, status: true, points: true },
      },
    },
  });

  if (!activeSprint) return null;

  const sprintTickets = activeSprint.tickets || [];
  const totalTickets = sprintTickets.length;
  const doneTickets = sprintTickets.filter((t) => t.status === "DONE").length;
  const inProgressTickets = sprintTickets.filter(
    (t) => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW"
  ).length;
  const todoTickets = totalTickets - doneTickets - inProgressTickets;
  const totalPoints = sprintTickets.reduce(
    (sum, t) => sum + (t.points || 0),
    0
  );
  const completedPoints = sprintTickets
    .filter((t) => t.status === "DONE")
    .reduce((sum, t) => sum + (t.points || 0), 0);
  const progress =
    totalPoints > 0
      ? Math.round((completedPoints / totalPoints) * 100)
      : totalTickets > 0
      ? Math.round((doneTickets / totalTickets) * 100)
      : 0;

  const now = new Date();
  const endDate = new Date(activeSprint.endDate);
  const daysRemaining = Math.ceil(
    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    id: activeSprint.id,
    name: activeSprint.name,
    projectName: activeSprint.project?.name || "Project",
    projectId: activeSprint.project?.id,
    progress,
    daysRemaining,
    totalTickets,
    doneTickets,
    inProgressTickets,
    todoTickets,
    totalPoints,
    completedPoints,
  };
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
