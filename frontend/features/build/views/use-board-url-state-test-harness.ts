let mockSearchParams = new URLSearchParams();
export const mockReplace = jest.fn();
export const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  usePathname: () => "/build/1/issues",
}));

export const mockCreateViewMutate = jest.fn();
export const mockUpdateViewMutate = jest.fn();
export const boardState: {
  views: unknown[];
  boardTickets: unknown[];
  boardFilters?: Record<string, unknown>;
  qaMatches?: Array<{ id: number }>;
} = { views: [], boardTickets: [] };

jest.mock("@/hooks/api/build/projects", () => ({
  useProject: () => ({
    data: { id: 1, key: "TEST", name: "Test", members: [], statuses: [] },
  }),
}));

jest.mock("@/hooks/api/build/views", () => ({
  useViews: () => ({
    data: {
      data: boardState.views,
      pagination: { limit: 100, hasMore: false, nextCursor: null },
    },
  }),
  useCreateView: () => ({ mutate: mockCreateViewMutate, isPending: false }),
  useUpdateView: () => ({ mutate: mockUpdateViewMutate, isPending: false }),
}));

jest.mock("@/hooks/api/build/tickets", () => ({
  useProjectBoardTickets: (_projectId: number, filters: Record<string, unknown>) => {
    boardState.boardFilters = filters;
    return {
    data: boardState.boardTickets,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    isTruncated: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
    };
  },
}));

export const mockUseBugs = jest.fn();

jest.mock("@/hooks/api/build/bugs", () => ({
  useBugs: (projectId?: number, filters?: Record<string, string | undefined>) => {
    mockUseBugs(projectId, filters);
    return { data: boardState.qaMatches, isLoading: false };
  },
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));


export function nameEvent(value: string) {
  return { target: { value } };
}

export function setParams(init: Record<string, string>) {
  mockSearchParams = new URLSearchParams(init);
  const qs = mockSearchParams.toString();
  window.history.replaceState({}, "", qs ? `/?${qs}` : "/");
}

export function installBoardUrlStateMocks() {
  boardState.views = [];
  boardState.boardTickets = [];
  boardState.boardFilters = undefined;
  boardState.qaMatches = undefined;
  mockUseBugs.mockClear();
  setParams({});
  mockReplace.mockClear();
  mockPush.mockClear();
  mockCreateViewMutate.mockClear();
  mockUpdateViewMutate.mockClear();
  localStorage.clear();
}
