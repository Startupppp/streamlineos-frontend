"server-only";

import { db } from "@/lib/db";
import {
  tickets,
  sprints,
  timesheets,
} from "@/lib/db/schema";
import { eq, and, desc, sql, gte, lte, or } from "drizzle-orm";
import type { TicketFilters, TimeEntryFilters } from "@/types/projects";

export async function getTickets(
  orgId: string,
  projectId?: number,
  filters?: TicketFilters
) {
  const conditions = [eq(tickets.orgId, orgId)];

  if (projectId) {
    conditions.push(eq(tickets.projectId, projectId));
  }

  if (filters?.search) {
    conditions.push(
      or(
        sql`${tickets.title} ILIKE ${"%" + filters.search + "%"}`,
        sql`${tickets.description} ILIKE ${"%" + filters.search + "%"}`
      )!
    );
  }

  if (filters?.status) {
    conditions.push(eq(tickets.status, filters.status));
  }

  if (filters?.sprintId) {
    conditions.push(eq(tickets.sprintId, filters.sprintId));
  }

  if (filters?.assigneeId) {
    conditions.push(eq(tickets.assigneeId, filters.assigneeId));
  }

  const limit = filters?.limit ?? 50;
  const offset = filters?.page ? (filters.page - 1) * limit : 0;

  return db.query.tickets.findMany({
    where: and(...conditions),
    with: {
      assignee: true,
      reporter: true,
      assignees: { with: { user: true } },
      labels: { with: { label: true } },
    },
    orderBy: [desc(tickets.updatedAt)],
    limit,
    offset,
  });
}

export async function getTicket(orgId: string, id: number) {
  return db.query.tickets.findFirst({
    where: and(eq(tickets.id, id), eq(tickets.orgId, orgId)),
    with: {
      project: true,
      sprint: true,
      assignee: true,
      reporter: true,
      assignees: { with: { user: true } },
      comments: { with: { user: true }, orderBy: [desc(sql`created_at`)] },
      attachments: { with: { uploader: true } },
      labels: { with: { label: true } },
    },
  });
}

export async function getSprints(orgId: string, projectId?: number) {
  const conditions = [eq(sprints.orgId, orgId)];
  if (projectId) {
    conditions.push(eq(sprints.projectId, projectId));
  }
  return db.query.sprints.findMany({
    where: and(...conditions),
    with: {
      tickets: { with: { assignee: true } },
    },
    orderBy: [desc(sprints.startDate)],
  });
}

export async function getSprint(orgId: string, id: number) {
  return db.query.sprints.findFirst({
    where: and(eq(sprints.id, id), eq(sprints.orgId, orgId)),
    with: {
      tickets: { with: { assignee: true } },
    },
  });
}

export async function getSprintBurndown(sprintId: number, orgId: string) {
  const sprint = await db.query.sprints.findFirst({
    where: and(eq(sprints.id, sprintId), eq(sprints.orgId, orgId)),
    with: { tickets: true },
  });

  if (!sprint) return null;

  const totalPoints = sprint.tickets.reduce(
    (sum, t) => sum + (t.points || 0),
    0
  );

  const allTimeEntries = await db.query.timesheets.findMany({
    where: and(
      eq(timesheets.orgId, orgId),
      sql`${timesheets.ticketId} IN (SELECT id FROM tickets WHERE sprint_id = ${sprintId})`
    ),
    with: { ticket: true },
  });

  return { sprint, totalPoints, allTimeEntries };
}

export async function getTimeEntries(orgId: string, filters?: TimeEntryFilters) {
  const conditions = [eq(timesheets.orgId, orgId)];

  if (filters?.ticketId) {
    conditions.push(eq(timesheets.ticketId, filters.ticketId));
  }
  if (filters?.userId) {
    conditions.push(eq(timesheets.userId, filters.userId));
  }
  if (filters?.startDate) {
    conditions.push(gte(timesheets.date, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(timesheets.date, filters.endDate));
  }
  if (filters?.status) {
    conditions.push(eq(timesheets.status, filters.status));
  }
  if (filters?.projectId) {
    conditions.push(
      sql`${timesheets.ticketId} IN (
        SELECT id FROM tickets WHERE project_id = ${filters.projectId} AND org_id = ${orgId}
      )`
    );
  }

  const limit = filters?.limit ?? 50;
  const offset = filters?.page ? (filters.page - 1) * limit : 0;

  return db.query.timesheets.findMany({
    where: and(...conditions),
    orderBy: [desc(timesheets.date)],
    limit,
    offset,
    with: {
      ticket: {
        with: { project: true },
      },
    },
  });
}

export async function getMyTimeEntries(
  userId: string,
  orgId: string,
  filters?: Omit<TimeEntryFilters, "userId">
) {
  return getTimeEntries(orgId, { ...filters, userId });
}
