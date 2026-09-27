export interface FixtureRow {
  id: number;
  name: string;
}

export function makeRows(
  count: number,
  overrides?: Partial<FixtureRow>,
): FixtureRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Row ${i + 1}`,
    ...overrides,
  }));
}

export const ACCESS_GRANTED_FIXTURE = {
  data: {
    isOrgOwner: false as const,
    scopes: { "build:view": "all" as const },
    modules: {},
  },
  isLoading: false,
} as const;

export const ACCESS_DENIED_FIXTURE = {
  data: { isOrgOwner: false as const, scopes: {}, modules: {} },
  isLoading: false,
} as const;

export const ACCESS_LOADING_FIXTURE = {
  data: undefined,
  isLoading: true,
} as const;

export function cursorPage<T>(
  items: T[],
  overrides?: { hasMore?: boolean; nextCursor?: string | null },
) {
  return {
    data: items,
    pagination: {
      limit: 25,
      hasMore: overrides?.hasMore ?? false,
      nextCursor: overrides?.nextCursor ?? null,
    },
  };
}

export function baseQueryResult<T>(overrides?: {
  data?: T;
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
}) {
  return {
    data: overrides?.data,
    isLoading: overrides?.isLoading ?? false,
    isError: overrides?.isError ?? false,
    error: overrides?.error,
    refetch: jest.fn(),
  };
}
