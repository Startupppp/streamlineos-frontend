interface ProjectStatusRef {
  name: string;
  type?: string | null;
}

export function getCompletedStatusNames(
  statuses?: ProjectStatusRef[],
): Set<string> {
  const names = new Set<string>(["DONE"]);
  if (!statuses) return names;
  for (const status of statuses) {
    if (status.type === "completed") {
      names.add(status.name);
    }
  }
  return names;
}

export function isCompletedTicketStatus(
  status: string,
  statuses?: ProjectStatusRef[],
): boolean {
  return getCompletedStatusNames(statuses).has(status);
}

export function filterHiddenCompletedTickets<T extends { status: string }>(
  tickets: T[],
  hideCompleted: boolean,
  statuses?: ProjectStatusRef[],
): T[] {
  if (!hideCompleted) return tickets;
  const completed = getCompletedStatusNames(statuses);
  return tickets.filter((ticket) => !completed.has(ticket.status));
}
