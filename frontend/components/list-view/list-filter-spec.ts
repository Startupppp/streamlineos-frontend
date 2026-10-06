export type FilterArity = "single" | "multi" | "range";

export interface FilterCategorySpec {
  key: string;
  label: string;
  arity: FilterArity;
  params: readonly string[];
}

export interface ListFilterSpec {
  categories: readonly FilterCategorySpec[];
  searchParam?: string;
  searchDebounceMs?: number;
  pageParam?: string;
  cursorParam?: string;
}

export type FilterValues = Readonly<Record<string, readonly string[]>>;

export const DEFAULT_SEARCH_PARAM = "q";
export const DEFAULT_PAGE_PARAM = "page";
export const DEFAULT_SEARCH_DEBOUNCE_MS = 300;

export function categoryParams(spec: ListFilterSpec): string[] {
  return spec.categories.flatMap((category) => [...category.params]);
}

export function hasActiveValue(values: readonly string[]): boolean {
  return values.some((value) => value !== "");
}

export function countActiveCategories(
  spec: ListFilterSpec,
  values: FilterValues,
): number {
  return spec.categories.filter((category) =>
    hasActiveValue(values[category.key] ?? []),
  ).length;
}
