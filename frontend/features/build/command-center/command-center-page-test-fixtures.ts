import { useCan, useAccess } from "@/hooks/api/access";
import { useProjects } from "@/hooks/api/build/projects";
import { useInfiniteAllWork, useAllWork } from "@/hooks/api/build/all-work";
import {
  mockUseOnlineStatus,
  mockRouterPush,
  mockSearchParamsRef,
  mockUseKeyboardShortcuts,
  mockUseDashboardLayout,
} from "./command-center-page-test-harness";

export const mockUseCan: jest.Mock = jest.mocked(useCan);
export const mockUseAccess: jest.Mock = jest.mocked(useAccess);
export const mockUseProjects: jest.Mock = jest.mocked(useProjects);
export const mockUseInfiniteAllWork: jest.Mock = jest.mocked(useInfiniteAllWork);
export const mockUseAllWork: jest.Mock = jest.mocked(useAllWork);
export const ACCESS_GRANTED = {
  data: {
    isOrgOwner: false,
    scopes: {
      "build:view": "all",
      "build:tickets:view": "all",
      "build:approvals:view": "all",
      "build:risks:view": "all",
    },
    modules: {},
  },
  isLoading: false,
};

export function baseProjectsResult(overrides: Record<string, unknown> = {}) {
  return {
    data: { data: [], hasMore: false, total: 0 },
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    ...overrides,
  };
}

export function baseInfiniteResult(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
    ...overrides,
  };
}

export function installCommandCenterMocks() {
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseProjects.mockReturnValue(baseProjectsResult());
  mockUseInfiniteAllWork.mockReturnValue(baseInfiniteResult());
  mockUseAllWork.mockReturnValue({ data: undefined, refetch: jest.fn() });
  mockUseOnlineStatus.mockReturnValue(true);
  mockUseKeyboardShortcuts.mockReset();
  mockRouterPush.mockClear();
  mockUseDashboardLayout.mockReturnValue({ data: undefined, isLoading: false });
  mockSearchParamsRef.current = new URLSearchParams();
}
