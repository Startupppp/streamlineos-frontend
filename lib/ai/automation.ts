import { db } from "../db";
import { tickets, timesheets } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { formatDateOnly } from "../date-utils";

export interface TaskSuggestion {
  ticketId: number;
  title: string;
  reason: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}

export interface WorkloadAnalysis {
  userId: string;
  userName: string;
  activeTickets: number;
  totalPoints: number;
  hoursThisWeek: number;
  recommendation: "AVAILABLE" | "MODERATE" | "HEAVY" | "OVERLOADED";
}

export async function suggestTaskAssignments(
  orgId: string,
  projectId: number
): Promise<TaskSuggestion[]> {
  const projectTickets = await db.query.tickets.findMany({
    where: and(
      eq(tickets.orgId, orgId),
      eq(tickets.projectId, projectId),
      eq(tickets.status, "TODO")
    ),
    with: {
      assignee: true,
    },
  });

  const unassignedTickets = projectTickets.filter((t) => !t.assigneeId);

  return unassignedTickets.slice(0, 5).map((ticket) => ({
    ticketId: ticket.id,
    title: ticket.title,
    reason: "Unassigned ticket needs attention",
    priority: (ticket.priority || "MEDIUM") as
      | "LOW"
      | "MEDIUM"
      | "HIGH"
      | "URGENT",
  }));
}

export async function analyzeWorkload(
  orgId: string
): Promise<WorkloadAnalysis[]> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const activeTickets = await db.query.tickets.findMany({
    where: and(
      eq(tickets.orgId, orgId),
      sql`${tickets.status} IN ('TODO', 'IN_PROGRESS', 'IN_REVIEW')`
    ),
    with: {
      assignee: true,
    },
  });

  const timeEntries = await db.query.timesheets.findMany({
    where: and(
      eq(timesheets.orgId, orgId),
      sql`${timesheets.date} >= ${formatDateOnly(weekAgo)}`
    ),
  });

  const userWorkload = new Map<string, WorkloadAnalysis>();

  activeTickets.forEach((ticket) => {
    if (!ticket.assigneeId) return;

    const existing = userWorkload.get(ticket.assigneeId);
    const points = ticket.points || 0;

    if (existing) {
      existing.activeTickets += 1;
      existing.totalPoints += points;
    } else {
      const assignee =
        ticket.assignee &&
        typeof ticket.assignee === "object" &&
        !Array.isArray(ticket.assignee)
          ? (ticket.assignee as { firstName?: string; lastName?: string })
          : null;
      userWorkload.set(ticket.assigneeId, {
        userId: ticket.assigneeId,
        userName: assignee?.firstName || "Unknown",
        activeTickets: 1,
        totalPoints: points,
        hoursThisWeek: 0,
        recommendation: "AVAILABLE",
      });
    }
  });

  timeEntries.forEach((entry) => {
    if (!entry.userId) return;
    const workload = userWorkload.get(entry.userId);
    if (workload) {
      workload.hoursThisWeek += parseFloat(entry.hours || "0");
    }
  });

  const analyses = Array.from(userWorkload.values());

  analyses.forEach((analysis) => {
    if (analysis.hoursThisWeek > 40 || analysis.activeTickets > 10) {
      analysis.recommendation = "OVERLOADED";
    } else if (analysis.hoursThisWeek > 30 || analysis.activeTickets > 7) {
      analysis.recommendation = "HEAVY";
    } else if (analysis.hoursThisWeek > 20 || analysis.activeTickets > 4) {
      analysis.recommendation = "MODERATE";
    } else {
      analysis.recommendation = "AVAILABLE";
    }
  });

  return analyses;
}
