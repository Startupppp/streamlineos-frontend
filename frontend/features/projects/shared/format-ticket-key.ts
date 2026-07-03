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
