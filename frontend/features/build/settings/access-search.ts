type AccessSearchValue = string | null | undefined;

export function matchesAccessSearch(
  query: string,
  values: readonly AccessSearchValue[],
) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;

  return values.some((value) =>
    value?.toLocaleLowerCase().includes(normalizedQuery),
  );
}
