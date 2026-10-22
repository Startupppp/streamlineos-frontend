export function formatTicketKey(
  projectKey: string | null | undefined,
  ticketNumber: number | string | null | undefined,
  fallbackId?: number | string,
): string {
  if (projectKey && ticketNumber != null && ticketNumber !== "") {
    return `${projectKey}-${ticketNumber}`;
  }
  if (fallbackId != null) {
    return typeof fallbackId === "string" ? fallbackId : `#${fallbackId}`;
  }
  return `#${ticketNumber ?? "?"}`;
}

export interface ParsedTicketKey {
  projectKey?: string;
  ticketNumber: number;
}

export function parseTicketKey(ticketKey: string): ParsedTicketKey | null {
  const keyMatch = ticketKey.match(/^([A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*)-(\d+)$/);
  const ticketNumber = Number(keyMatch?.[2] ?? ticketKey);
  if (!Number.isSafeInteger(ticketNumber) || ticketNumber <= 0 || ticketNumber > 2147483647) return null;
  if (keyMatch) {
    return {
      projectKey: keyMatch[1],
      ticketNumber,
    };
  }
  if (String(ticketNumber) === ticketKey) {
    return { ticketNumber };
  }
  return null;
}

export function getTicketDetailHref(
  projectId: number,
  projectKey: string | null | undefined,
  ticketNumber: number | string,
  commentId?: number | string | null,
): string {
  const key = projectKey
    ? formatTicketKey(projectKey, ticketNumber)
    : String(ticketNumber);
  const base = `/build/${projectId}/tickets/${encodeURIComponent(key)}`;
  if (commentId != null && commentId !== "") return `${base}?comment=${commentId}`;
  return base;
}

export function ticketKeyMatchesProject(
  parsed: ParsedTicketKey | null,
  projectKey: string | null | undefined,
): boolean {
  if (!parsed) return false;
  if (parsed.projectKey == null || parsed.projectKey === "") return true;
  if (projectKey == null || projectKey === "") return false;
  return parsed.projectKey.toUpperCase() === projectKey.toUpperCase();
}
