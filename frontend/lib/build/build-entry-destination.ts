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

export function resolveBuildEntryDestination(
  searchParams: Record<string, string | string[] | undefined>,
): string {
  const projectQuery = new URLSearchParams();
  for (const key of LEGACY_PROJECT_QUERY_KEYS) {
    const value = searchParams[key];
    const firstValue = Array.isArray(value) ? value[0] : value;
    if (firstValue !== undefined) projectQuery.set(key, firstValue);
  }
  const query = projectQuery.toString();
  return query.length > 0
    ? `/build/projects?${query}`
    : "/build/command-center";
}
