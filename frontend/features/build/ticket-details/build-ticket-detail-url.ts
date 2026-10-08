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
  "draftCursors",
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
  "item",
  "mode",
] as const;

function ticketCollectionPaths(projectId: number): readonly string[] {
  return [
    `/build/${projectId}/issues`,
    `/build/${projectId}/workload`,
    `/build/${projectId}/intake`,
    `/build/${projectId}/triage`,
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

export function buildIntakeReturnHref(
  projectId: number,
  searchParams: SearchParamsSource,
): string {
  return buildTicketCollectionReturnHref(
    projectId,
    `/build/${projectId}/intake`,
    searchParams,
  );
}

export function getIntakeTicketHref(
  projectId: number,
  projectKey: string | null | undefined,
  ticketNumber: number,
  returnHref: string,
): string {
  const href = getTicketDetailHref(projectId, projectKey, ticketNumber);
  const query = new URLSearchParams({
    returnTo: resolveTicketBackHref(projectId, returnHref),
  });
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

const TICKET_ROUTE_PATTERN = /^\/build\/([^/]+)\/tickets\/([^/]+)\/?$/;

export function decodeRouteSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

export function isTicketDetailPath(
  pathname: string | null,
  projectId: number,
  ticketKey: string,
): boolean {
  const match = pathname?.match(TICKET_ROUTE_PATTERN);
  if (!match) return false;
  const routeProjectId = decodeRouteSegment(match[1]);
  const routeTicketKey = decodeRouteSegment(match[2]);
  return (
    routeProjectId !== null &&
    Number(routeProjectId) === projectId &&
    routeTicketKey === ticketKey
  );
}


export function boardCollectionSearchParams(
  projectId: number,
  pathname: string,
  searchParams: SearchParamsSource,
): URLSearchParams {
  const match = pathname.match(TICKET_ROUTE_PATTERN);
  if (!match) {
    const next = new URLSearchParams();
    for (const key of [
      ...TICKET_COLLECTION_QUERY_KEYS,
      "ticket",
      "comment",
      "create",
      "cycleId",
      "returnTo",
    ] as const) {
      const value = searchParams.get(key);
      if (value) next.set(key, value);
    }
    return next;
  }
  const back = resolveTicketBackHref(projectId, searchParams.get("returnTo"));
  try {
    return new URL(back, "https://streamline.invalid").searchParams;
  } catch {
    return new URLSearchParams();
  }
}

export function buildEpicDetailUrl(
  projectId: number,
  epicId: number,
  returnHref?: string | null,
): string {
  const base = `/build/${projectId}/epics/${epicId}`;
  if (!returnHref) return base;
  const params = new URLSearchParams({ returnTo: returnHref });
  return `${base}?${params}`;
}

export function buildPersonDetailUrl(employeeId: string): string {
  return `/hr/employees/${employeeId}`;
}

export function buildClientDetailUrl(clientId: number): string {
  return `/crm/clients/${clientId}`;
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
