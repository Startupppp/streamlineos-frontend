import { useCan, useAccess } from "@/hooks/api/access";
import { useProjects } from "@/hooks/api/build/projects";
import { useInfiniteAllWork, useAllWork } from "@/hooks/api/build/all-work";
import { useDashboardLayoutEditor } from "./use-dashboard-layout";
import {
  mockUseOnlineStatus,
  mockRouterPush,
  mockSearchParamsRef,
  mockUseKeyboardShortcuts,
} from "./command-center-page-test-harness";

export const mockUseCan = jest.mocked(useCan);
export const mockUseAccess = jest.mocked(useAccess);
export const mockUseProjects = jest.mocked(useProjects);
export const mockUseInfiniteAllWork = jest.mocked(useInfiniteAllWork);
export const mockUseAllWork = jest.mocked(useAllWork);
export const mockUseDashboardLayoutEditor = jest.mocked(useDashboardLayoutEditor);

export const DEFAULT_LAYOUT_MOCK = {
  config: {
    widgets: [
      { type: "my-issues", position: { col: 0, row: 0, w: 3, h: 4 } },
      { type: "projects", position: { col: 3, row: 0, w: 2, h: 4 } },
      { type: "approvals", position: { col: 0, row: 4, w: 2, h: 3 } },
      { type: "agent-runs", position: { col: 2, row: 4, w: 2, h: 3 } },
      { type: "risks", position: { col: 4, row: 4, w: 1, h: 3 } },
      { type: "releases", position: { col: 0, row: 7, w: 3, h: 3 } },
      { type: "blockers", position: { col: 3, row: 7, w: 2, h: 3 } },
    ],
  },
  layoutVersion: 1,
  isPending: false,
  reorder: jest.fn(),
  removeWidget: jest.fn(),
  addWidget: jest.fn(),
  resetToDefault: jest.fn(),
};

export const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:view": "all" }, modules: {} },
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
  mockUseDashboardLayoutEditor.mockReturnValue({
    ...DEFAULT_LAYOUT_MOCK,
    reorder: jest.fn(),
    removeWidget: jest.fn(),
    addWidget: jest.fn(),
    resetToDefault: jest.fn(),
  });
  mockSearchParamsRef.current = new URLSearchParams();
}
