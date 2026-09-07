export function resolveOrgUnitName(
  names: ReadonlyMap<string, string>,
  id: string | null,
  fallback: string,
): string {
  if (id === null) return "—";
  return names.get(id) ?? fallback;
}
