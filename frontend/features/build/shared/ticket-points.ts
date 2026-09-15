export function parseTicketPointsInput(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}
