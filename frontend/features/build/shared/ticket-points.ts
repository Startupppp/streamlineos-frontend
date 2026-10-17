import { MAX_TICKET_POINTS } from "@/lib/validation/projects";

export function parseTicketPointsInput(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (/[eE.]/.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_TICKET_POINTS) return undefined;
  return parsed;
}
