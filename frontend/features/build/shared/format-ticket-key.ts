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
  const keyMatch = ticketKey.match(/^([A-Za-z][A-Za-z0-9]*)-(\d+)$/);
  if (keyMatch) {
    return {
      projectKey: keyMatch[1],
      ticketNumber: parseInt(keyMatch[2], 10),
    };
  }
  const numOnly = parseInt(ticketKey, 10);
  if (Number.isFinite(numOnly) && String(numOnly) === ticketKey) {
    return { ticketNumber: numOnly };
  }
  return null;
}

export function getTicketDetailHref(
  projectId: number,
  projectKey: string | null | undefined,
  ticketNumber: number | string,
  commentId?: number | string | null,
): string {
  const key = formatTicketKey(projectKey, ticketNumber);
  const base = `/build/${projectId}/tickets/${encodeURIComponent(key)}`;
  if (commentId != null && commentId !== "") return `${base}?comment=${commentId}`;
  return base;
}
