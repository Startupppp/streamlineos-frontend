export const STANDARD_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

// Satisfied by both `useSearchParams()` and a `URLSearchParams` built from a server `searchParams`.
export interface SearchParamsReader {
  get(name: string): string | null;
}

export const DEFAULT_PAGE_SIZE = 20;

export function parsePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function parsePageSize(
  value: string | null,
  options: readonly number[] = STANDARD_PAGE_SIZE_OPTIONS,
  fallback: number = DEFAULT_PAGE_SIZE,
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && options.includes(parsed)
    ? parsed
    : fallback;
}

export function getLastPage(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
