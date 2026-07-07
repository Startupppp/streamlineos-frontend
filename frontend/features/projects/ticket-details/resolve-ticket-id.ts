import type { ParsedTicketKey } from "../shared/format-ticket-key";

interface TicketRef {
  id: number;
  ticketNumber: number;
}

export function resolveTicketId(
  parsed: ParsedTicketKey,
  projectKey: string | null | undefined,
  tickets: TicketRef[] | undefined,
): number | null {
  if (!tickets?.length) return null;
  if (parsed.projectKey && projectKey && parsed.projectKey.toUpperCase() !== projectKey.toUpperCase()) {
    return null;
  }
  const match = tickets.find((t) => t.ticketNumber === parsed.ticketNumber);
  return match?.id ?? null;
}
