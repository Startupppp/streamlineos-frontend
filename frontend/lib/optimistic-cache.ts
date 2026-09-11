import type {
  InfiniteData,
  QueryClient,
  QueryFilters,
  QueryKey,
} from "@tanstack/react-query";

/**
 * The four cache shapes this codebase stores rows in. Everything else is left
 * untouched by a patch rather than guessed at, so an unrecognised shape degrades
 * to "no optimistic update" instead of a corrupted cache.
 */
export type RowPage<TRow> = TRow[] | { data: TRow[] } | { items: TRow[] };
export type RowCache<TRow> = RowPage<TRow> | InfiniteData<RowPage<TRow>>;

export type CacheSnapshot = ReadonlyArray<readonly [QueryKey, unknown]>;

function isInfinite<TRow>(
  value: RowCache<TRow>,
): value is InfiniteData<RowPage<TRow>> {
  return !Array.isArray(value) && "pages" in value && Array.isArray(value.pages);
}

function patchPage<TRow>(
  page: RowPage<TRow>,
  update: (rows: TRow[]) => TRow[],
): RowPage<TRow> {
  if (Array.isArray(page)) return update(page);
  if ("data" in page && Array.isArray(page.data)) return { ...page, data: update(page.data) };
  if ("items" in page && Array.isArray(page.items)) return { ...page, items: update(page.items) };
  return page;
}

/**
 * Cancel every in-flight read for these keys and snapshot what is there now.
 * Cancelling first is what stops a refetch that started before the mutation from
 * landing after the optimistic write and silently undoing it.
 */
export async function cancelAndSnapshot(
  queryClient: QueryClient,
  filters: readonly QueryFilters[],
): Promise<CacheSnapshot> {
  await Promise.all(filters.map((filter) => queryClient.cancelQueries(filter)));
  return filters.flatMap((filter) => queryClient.getQueriesData(filter));
}

/** Put every snapshotted entry back exactly as it was. */
export function restoreSnapshot(queryClient: QueryClient, snapshot: CacheSnapshot): void {
  for (const [key, value] of snapshot) queryClient.setQueryData(key, value);
}

/**
 * Apply `update` to the rows of every query matching `filters`, whatever shape
 * each one stores them in — flat array, cursor page, or InfiniteData over either.
 */
export function patchRows<TRow>(
  queryClient: QueryClient,
  filters: QueryFilters,
  update: (rows: TRow[]) => TRow[],
): void {
  queryClient.setQueriesData<RowCache<TRow>>(filters, (current) => {
    if (current === undefined) return current;
    if (isInfinite(current))
      return { ...current, pages: current.pages.map((page) => patchPage(page, update)) };
    return patchPage(current, update);
  });
}

/** Replace one row wherever it appears, matched by `identity`. */
export function patchRow<TRow>(
  queryClient: QueryClient,
  filters: QueryFilters,
  identity: (row: TRow) => boolean,
  update: (row: TRow) => TRow,
): void {
  patchRows<TRow>(queryClient, filters, (rows) =>
    rows.map((row) => (identity(row) ? update(row) : row)),
  );
}

/** Drop one row wherever it appears, matched by `identity`. */
export function removeRow<TRow>(
  queryClient: QueryClient,
  filters: QueryFilters,
  identity: (row: TRow) => boolean,
): void {
  patchRows<TRow>(queryClient, filters, (rows) => rows.filter((row) => !identity(row)));
}

/** Update a scalar count cache, leaving a missing entry missing. */
export function patchCount(
  queryClient: QueryClient,
  key: QueryKey,
  update: (value: number) => number,
): void {
  queryClient.setQueryData<number>(key, (current) =>
    current === undefined ? current : update(current),
  );
}

/** Update a single detail entry, leaving a missing entry missing. */
export function patchDetail<TValue>(
  queryClient: QueryClient,
  key: QueryKey,
  update: (value: TValue) => TValue,
): void {
  queryClient.setQueryData<TValue>(key, (current) =>
    current === undefined ? current : update(current),
  );
}
