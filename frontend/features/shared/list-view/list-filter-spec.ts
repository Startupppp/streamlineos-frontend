/**
 * A list page declares what it filters by; the hook decides how filtering works.
 *
 * `range` exists because a category is not always one parameter: a due-date
 * filter owns two and must still read as one active filter and clear as one
 * unit. Modelling that as two categories is what forced the previous hook to
 * special-case it by name.
 */
export type FilterArity = "single" | "multi" | "range";

export interface FilterCategorySpec {
  /** Stable key for this category, and the key its values are held under. */
  key: string;
  label: string;
  arity: FilterArity;
  /** URL parameters this category owns. `range` owns one per position. */
  params: readonly string[];
}

export interface ListFilterSpec {
  categories: readonly FilterCategorySpec[];
  searchParam?: string;
  searchDebounceMs?: number;
  pageParam?: string;
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
