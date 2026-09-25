import type { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query";
import { idleInfiniteQueryResult } from "@/test-utils/query-result";
import type {
  ManagedProduct,
  ManagedProductsPage,
  ProjectListItem,
  ProjectListResponse,
} from "@/types/projects";

export function makeEmptyInfiniteQuery<TPage, TPageParam>(
  overrides: Partial<UseInfiniteQueryResult<InfiniteData<TPage, TPageParam>, Error>> = {},
): UseInfiniteQueryResult<InfiniteData<TPage, TPageParam>, Error> {
  const result = idleInfiniteQueryResult<TPage, TPageParam>();
  Object.assign(result, {
    fetchNextPage: jest.fn().mockResolvedValue(undefined),
    refetch: jest.fn(),
    ...overrides,
  });
  return result;
}

export function makeManagedProductsPage(
  rows: { id: number; name: string; status: string; key: string }[],
  hasMore = false,
  nextCursor: string | null = null,
): ManagedProductsPage {
  return {
    data: rows.map(
      (row): ManagedProduct => ({
        ...row,
        orgId: "org-1",
        description: null,
        ownerId: null,
        vision: null,
        missionStatement: null,
        targetCustomer: null,
        differentiators: null,
        currentPhase: null,
        targetLaunchDate: null,
        successMetrics: null,
        ownerMembershipId: null,
        deletedAt: null,
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      }),
    ),
    pagination: { limit: 100, hasMore, nextCursor },
  };
}

export function makeInfiniteProductsData(
  pages: ManagedProductsPage[],
): { pages: ManagedProductsPage[]; pageParams: (string | undefined)[] } {
  return {
    pages,
    pageParams: pages.map((_, i) =>
      i === 0 ? undefined : pages[i - 1]?.pagination.nextCursor ?? undefined,
    ),
  };
}

export function makeProjectsInfiniteData(
  pages: {
    data: {
      id: number;
      name: string;
      key: string;
      status: ProjectListItem["status"];
      managedProductId: number | null;
    }[];
    hasMore: boolean;
    nextCursor: number | null;
  }[],
): { pages: ProjectListResponse[]; pageParams: (number | undefined)[] } {
  return {
    pages: pages.map((page) => ({
      ...page,
      data: page.data.map(
        (row): ProjectListItem => ({
          ...row,
          description: null,
          priority: null,
          health: "on_track",
          startDate: null,
          endDate: null,
          manager: null,
          progress: { total: 0, done: 0, percentage: 0 },
          members: [],
          teams: [],
        }),
      ),
    })),
    pageParams: pages.map((_, i) => (i === 0 ? undefined : pages[i - 1]?.nextCursor ?? undefined)),
  };
}
