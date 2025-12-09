import { db } from '@/lib/db';
import { tickets, timesheets, attendance, projects } from '@/lib/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { format } from 'date-fns';

export interface TaskSuggestion {
  ticketId: number;
  title: string;
  reason: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export interface WorkloadAnalysis {
  userId: string;
  userName: string;
  activeTickets: number;
  totalPoints: number;
  hoursThisWeek: number;
  recommendation: 'AVAILABLE' | 'MODERATE' | 'HEAVY' | 'OVERLOADED';
}

export async function suggestTaskAssignments(
  orgId: string,
  projectId: number
): Promise<TaskSuggestion[]> {
  const projectTickets = await db.query.tickets.findMany({
    where: and(eq(tickets.orgId, orgId), eq(tickets.projectId, projectId), eq(tickets.status, 'TODO')),
    with: {
      assignee: true,
    },
  });

  const unassignedTickets = projectTickets.filter((t) => !t.assigneeId);

  return unassignedTickets.slice(0, 5).map((ticket) => ({
    ticketId: ticket.id,
    title: ticket.title,
    reason: 'Unassigned ticket needs attention',
    priority: (ticket.priority || 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
  }));
}

export async function analyzeWorkload(orgId: string): Promise<WorkloadAnalysis[]> {
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
      sql`${timesheets.date} >= ${format(weekAgo, 'yyyy-MM-dd')}`
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
      const assignee = ticket.assignee && typeof ticket.assignee === 'object' && !Array.isArray(ticket.assignee) 
        ? ticket.assignee as { firstName?: string; lastName?: string }
        : null;
      userWorkload.set(ticket.assigneeId, {
        userId: ticket.assigneeId,
        userName: assignee?.firstName || 'Unknown',
        activeTickets: 1,
        totalPoints: points,
        hoursThisWeek: 0,
        recommendation: 'AVAILABLE',
      });
    }
  });

  timeEntries.forEach((entry) => {
    if (!entry.userId) return;
    const workload = userWorkload.get(entry.userId);
    if (workload) {
      workload.hoursThisWeek += parseFloat(entry.hours || '0');
    }
  });

  const analyses = Array.from(userWorkload.values());

  analyses.forEach((analysis) => {
    if (analysis.hoursThisWeek > 40 || analysis.activeTickets > 10) {
      analysis.recommendation = 'OVERLOADED';
    } else if (analysis.hoursThisWeek > 30 || analysis.activeTickets > 7) {
      analysis.recommendation = 'HEAVY';
    } else if (analysis.hoursThisWeek > 20 || analysis.activeTickets > 4) {
      analysis.recommendation = 'MODERATE';
    } else {
      analysis.recommendation = 'AVAILABLE';
    }
  });

  return analyses;
}

export async function predictProjectDelays(orgId: string, projectId: number): Promise<{
  projectId: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
  suggestedActions: string[];
}> {
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.orgId, orgId), eq(projects.id, projectId)),
    with: {
      tickets: true,
    },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  const totalTickets = project.tickets?.length || 0;
  const completedTickets = project.tickets?.filter((t) => t.status === 'DONE').length || 0;
  const inProgressTickets = project.tickets?.filter((t) => t.status === 'IN_PROGRESS').length || 0;
  const completionRate = totalTickets > 0 ? completedTickets / totalTickets : 0;

  const endDate = project.endDate ? new Date(project.endDate) : null;
  const daysRemaining = endDate
    ? Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  let reason = '';
  const suggestedActions: string[] = [];

  if (completionRate < 0.3 && daysRemaining !== null && daysRemaining < 30) {
    riskLevel = 'HIGH';
    reason = `Low completion rate (${Math.round(completionRate * 100)}%) with ${daysRemaining} days remaining`;
    suggestedActions.push('Review and prioritize critical tickets');
    suggestedActions.push('Consider extending deadline or reducing scope');
    suggestedActions.push('Reassign resources if needed');
  } else if (completionRate < 0.5 && daysRemaining !== null && daysRemaining < 60) {
    riskLevel = 'MEDIUM';
    reason = `Moderate completion rate (${Math.round(completionRate * 100)}%) with ${daysRemaining} days remaining`;
    suggestedActions.push('Increase focus on high-priority tickets');
    suggestedActions.push('Monitor progress daily');
  } else if (inProgressTickets === 0 && totalTickets > completedTickets) {
    riskLevel = 'MEDIUM';
    reason = 'No tickets in progress';
    suggestedActions.push('Assign tickets to team members');
    suggestedActions.push('Review ticket priorities');
  }

  return {
    projectId,
    riskLevel,
    reason: reason || 'Project on track',
    suggestedActions: suggestedActions.length > 0 ? suggestedActions : ['Continue monitoring'],
  };
}

export async function analyzeAttendancePatterns(
  orgId: string,
  userId: string,
  days: number = 30
): Promise<{
  averageHours: number;
  totalDays: number;
  onTimeDays: number;
  lateDays: number;
  overtimeDays: number;
  pattern: string;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const records = await db.query.attendance.findMany({
    where: and(
      eq(attendance.orgId, orgId),
      eq(attendance.userId, userId),
      sql`${attendance.date} >= ${format(startDate, 'yyyy-MM-dd')}`
    ),
    orderBy: [desc(attendance.date)],
  });

  const totalDays = records.length;
  const totalHours = records.reduce((sum, r) => sum + parseFloat(r.workHours || '0'), 0);
  const averageHours = totalDays > 0 ? totalHours / totalDays : 0;
  const onTimeDays = records.filter((r) => {
    if (!r.checkIn) return false;
    const checkInHour = new Date(r.checkIn).getHours();
    return checkInHour <= 10;
  }).length;
  const lateDays = totalDays - onTimeDays;
  const overtimeDays = records.filter((r) => r.isOvertime).length;

  let pattern = 'Consistent';
  if (lateDays > totalDays * 0.3) {
    pattern = 'Frequently late';
  } else if (overtimeDays > totalDays * 0.3) {
    pattern = 'Frequently works overtime';
  } else if (averageHours < 7) {
    pattern = 'Below average hours';
  } else if (averageHours > 9) {
    pattern = 'Above average hours';
  }

  return {
    averageHours: Math.round(averageHours * 10) / 10,
    totalDays,
    onTimeDays,
    lateDays,
    overtimeDays,
    pattern,
  };
}

