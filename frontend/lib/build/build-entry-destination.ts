const LEGACY_PROJECT_QUERY_KEYS = [
  "create",
  "q",
  "view",
  "filterStatus",
  "filterHealth",
  "filterLead",
  "managerId",
  "productId",
  "clientId",
] as const;

const ALLOWED_SAVED_DESTINATION_PREFIX = "/build/";

const DESTINATION_BASE = "http://build.local";

export function isAllowedLandingDestination(destination: string): boolean {
  if (!destination.startsWith(ALLOWED_SAVED_DESTINATION_PREFIX) || destination.length > 200) return false;
  if (destination.includes("\\")) return false;
  const resolved = new URL(destination, DESTINATION_BASE);
  return (
    resolved.origin === DESTINATION_BASE &&
    resolved.pathname.startsWith(ALLOWED_SAVED_DESTINATION_PREFIX) &&
    `${resolved.pathname}${resolved.search}${resolved.hash}` === destination
  );
}

export function resolveBuildEntryDestination(
  searchParams: Record<string, string | string[] | undefined>,
  savedDestination?: string | null,
): string {
  const projectQuery = new URLSearchParams();
  for (const key of LEGACY_PROJECT_QUERY_KEYS) {
    const value = searchParams[key];
    const firstValue = Array.isArray(value) ? value[0] : value;
    if (firstValue !== undefined) projectQuery.set(key, firstValue);
  }
  const query = projectQuery.toString();
  if (query.length > 0) {
    return `/build/projects?${query}`;
  }
  if (
    savedDestination !== undefined &&
    savedDestination !== null &&
    isAllowedLandingDestination(savedDestination)
  ) {
    return savedDestination;
  }
  return "/build/command-center";
}
