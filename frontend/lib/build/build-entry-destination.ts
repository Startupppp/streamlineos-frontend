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

export function isAllowedLandingDestination(destination: string): boolean {
  return (
    destination.startsWith(ALLOWED_SAVED_DESTINATION_PREFIX) &&
    destination.length <= 200
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
