import { getTicketDetailHref } from "@/features/projects/shared/format-ticket-key";

interface TicketNavRef {
  id: number;
  ticketNumber: number;
}

export function buildTicketDetailUrl(
  projectId: number,
  projectKey: string | null | undefined,
  ticketId: number,
  tickets: TicketNavRef[],
  commentId?: number | null,
): string | null {
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return null;
  const base = getTicketDetailHref(projectId, projectKey, ticket.ticketNumber);
  if (commentId) return `${base}?comment=${commentId}`;
  return base;
}
