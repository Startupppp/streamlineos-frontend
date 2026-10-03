import { getTicketDetailHref } from "@/components/shared/format-ticket-key";

interface TicketNavRef {
  id: number;
  ticketNumber?: number;
}

interface SearchParamsSource {
  get(name: string): string | null;
}

const TICKET_COLLECTION_QUERY_KEYS = [
  "viewId",
  "view",
  "q",
  "status",
  "priority",
  "type",
  "assigneeId",
  "labels",
  "cycle",
  "module",
  "severity",
  "qaState",
  "groupBy",
  "orderBy",
  "rowBy",
  "columnBy",
  "completed",
  "cols",
  "cursor",
  "section",
  "relation",
  "tab",
  "sort",
  "dir",
  "group",
  "projectIds",
  "projectId",
  "cycleId",
  "dueDateFrom",
  "dueDateTo",
] as const;

function ticketCollectionPaths(projectId: number): readonly string[] {
  return [
    `/build/${projectId}/issues`,
    `/build/${projectId}/workload`,
    "/build/my-work",
  ];
}

export function buildMyWorkReturnHref(searchParams: SearchParamsSource): string {
  const next = new URLSearchParams();
  for (const key of TICKET_COLLECTION_QUERY_KEYS) {
    const value = searchParams.get(key);
    if (value) next.set(key, value);
  }
  const query = next.toString();
  const href = query ? `/build/my-work?${query}` : "/build/my-work";
  return href.length <= 2048 ? href : "/build/my-work";
}

export function getMyWorkTicketHref(
  projectId: number,
  projectKey: string | null | undefined,
  ticketNumber: number,
  returnHref: string,
): string {
  const href = getTicketDetailHref(projectId, projectKey, ticketNumber);
  const query = new URLSearchParams({ returnTo: resolveTicketBackHref(projectId, returnHref) });
  return `${href}?${query}`;
}

export function buildTicketCollectionReturnHref(
  projectId: number,
  pathname: string,
  searchParams: SearchParamsSource,
): string {
  const allowedPaths = ticketCollectionPaths(projectId);
  const safePathname = allowedPaths.includes(pathname)
    ? pathname
    : allowedPaths[0];
  const next = new URLSearchParams();

  for (const key of TICKET_COLLECTION_QUERY_KEYS) {
    const value = searchParams.get(key);
    if (value) next.set(key, value);
  }

  const query = next.toString();
  return query ? `${safePathname}?${query}` : safePathname;
}

export function resolveTicketBackHref(
  projectId: number,
  returnTo: string | null,
): string {
  const fallback = `/build/${projectId}/issues`;
  if (
    !returnTo ||
    returnTo.length > 2048 ||
    !returnTo.startsWith("/") ||
    returnTo.startsWith("//") ||
    returnTo.includes("\\")
  ) {
    return fallback;
  }

  const origin = "https://streamline.invalid";
  let candidate: URL;
  try {
    candidate = new URL(returnTo, origin);
  } catch {
    return fallback;
  }
  if (
    candidate.origin !== origin ||
    candidate.hash ||
    !ticketCollectionPaths(projectId).includes(candidate.pathname)
  ) {
    return fallback;
  }

  for (const key of candidate.searchParams.keys()) {
    if (!TICKET_COLLECTION_QUERY_KEYS.some((k) => k === key)) {
      return fallback;
    }
  }

  return `${candidate.pathname}${candidate.search}`;
}

export function buildTicketDetailUrl(
  projectId: number,
  projectKey: string | null | undefined,
  ticketId: number,
  tickets: TicketNavRef[],
  commentId?: number | null,
  returnHref?: string | null,
): string | null {
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket || ticket.ticketNumber == null) return null;
  const base = getTicketDetailHref(projectId, projectKey, ticket.ticketNumber);
  const params = new URLSearchParams();
  if (commentId) params.set("comment", String(commentId));
  if (returnHref) params.set("returnTo", returnHref);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
