import type { KanbanTicket } from "@/features/build/shared/types";

export function parseCreateCycleParam(param: string | null): number | null | undefined {
  if (param === null) return undefined;
  if (param === "none" || param === "") return null;
  return Number.isFinite(Number(param)) ? Number(param) : undefined;
}
import {
  filterHiddenCompletedTickets,
  getCompletedStatusNames,
} from "@/features/build/shared/completed-status";
import type { ProjectStatus, BoardMember } from "./board-types";

interface FilterBoardTicketsParams {
  allTickets: KanbanTicket[];
  hideCompleted: boolean;
  completedIssues: string;
  statuses: ProjectStatus[] | undefined;
  qaMatchIds: Set<number> | null;
}

export function filterBoardTickets({
  allTickets,
  hideCompleted,
  completedIssues,
  statuses,
  qaMatchIds,
}: FilterBoardTicketsParams): KanbanTicket[] {
  let tickets = filterHiddenCompletedTickets(allTickets, hideCompleted, statuses);
  tickets = tickets.filter((t) => t.type !== "EPIC");
  if (qaMatchIds) {
    tickets = tickets.filter((ticket) => qaMatchIds.has(Number(ticket.id)));
  }
  if (completedIssues !== "all") {
    if (completedIssues === "none") {
      tickets = filterHiddenCompletedTickets(tickets, true, statuses);
    } else {
      const cutoff = new Date();
      if (completedIssues === "last-day") cutoff.setDate(cutoff.getDate() - 1);
      else if (completedIssues === "last-week") cutoff.setDate(cutoff.getDate() - 7);
      else if (completedIssues === "last-month") cutoff.setMonth(cutoff.getMonth() - 1);
      const completedStatuses = getCompletedStatusNames(statuses);
      tickets = tickets.filter(
        (t) =>
          !completedStatuses.has(t.status) ||
          !t.updatedAt ||
          new Date(t.updatedAt) >= cutoff,
      );
    }
  }
  return tickets;
}

type MemberSource = { user?: { id: string; name?: string | null; firstName?: string | null; lastName?: string | null; image?: string | null } | null } | null | undefined;

export function computeBoardMembers(members: MemberSource[] | undefined): BoardMember[] {
  if (!members) return [];
  return members.flatMap((member) => {
    if (!member?.user) return [];
    return [{
      id: member.user.id,
      name: member.user.name ?? null,
      firstName: member.user.firstName ?? null,
      lastName: member.user.lastName ?? null,
      image: member.user.image ?? null,
    }];
  });
}

export function computeWipLimits(statuses: ProjectStatus[] | undefined): Record<string, number> {
  if (!statuses) return {};
  const result: Record<string, number> = {};
  for (const s of statuses) {
    if (s.wipLimit != null) result[s.name] = s.wipLimit;
  }
  return result;
}

export function computeDoneCount(
  allTickets: KanbanTicket[],
  statuses: ProjectStatus[] | undefined,
): number {
  const completedStatuses = getCompletedStatusNames(statuses);
  return allTickets.filter((t) => t.type !== "EPIC" && completedStatuses.has(t.status)).length;
}
