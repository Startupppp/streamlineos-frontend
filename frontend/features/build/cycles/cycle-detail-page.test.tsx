import { render, screen } from "@testing-library/react";
import { CycleDetailPage } from "./cycle-detail-page";

jest.mock("@/hooks/api", () => ({
  useProject: jest.fn(),
}));

jest.mock("@/hooks/api/build", () => ({
  useCycles: jest.fn(),
  useProjectBoardTickets: jest.fn(),
}));

jest.mock("@/hooks/api/build/ticket-queries", () => ({
  useTicketColumnCounts: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn() })),
  useSearchParams: jest.fn(() => ({ get: jest.fn(() => null), toString: jest.fn(() => "") })),
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {children}
    </div>
  ),
}));

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: ({ permission }: { permission?: string }) => (
    <div data-testid="no-permission">{permission}</div>
  ),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ description }: { description?: string }) => (
    <div data-testid="error-state">{description}</div>
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock("@/components/ui/kanban-skeleton", () => ({
  KanbanBoardSkeleton: () => <div data-testid="kanban-skeleton" />,
}));

jest.mock("@/components/ui/content-fill-panel", () => ({
  PAGE_CHROME_X: "page-chrome-x",
}));

jest.mock("@/features/build/views/kanban-board", () => ({
  KanbanBoard: () => <div data-testid="kanban-board" />,
}));

jest.mock("@/features/build/views/list-view", () => ({
  ListView: () => <div data-testid="list-view" />,
}));

jest.mock("@/features/build/views/view-switcher", () => ({
  ViewSwitcher: () => null,
  parseViewType: jest.fn(() => "board"),
}));

jest.mock("@/features/build/views/display-options-panel", () => ({
  DisplayOptionsPanel: () => null,
  DEFAULT_DISPLAY_OPTIONS: { groupBy: "none", rowBy: "none", showEmptyColumns: false, showEmptyRows: false },
}));

jest.mock("@/features/build/ticket-details/build-ticket-detail-url", () => ({
  buildTicketDetailUrl: jest.fn(() => null),
}));

import { useProject } from "@/hooks/api";
import { useCycles, useProjectBoardTickets } from "@/hooks/api/build";
import { useTicketColumnCounts } from "@/hooks/api/build/ticket-queries";
import { useCan, useAccess } from "@/hooks/api/access";
import { notFound } from "next/navigation";

const mockUseProject = useProject as jest.Mock;
const mockUseCycles = useCycles as jest.Mock;
const mockUseProjectBoardTickets = useProjectBoardTickets as jest.Mock;
const mockUseTicketColumnCounts = useTicketColumnCounts as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:cycles:view": "all" }, modules: {} },
  isLoading: false,
};
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};
const mockNotFound = notFound as jest.MockedFunction<typeof notFound>;

function baseQueryResult(overrides = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    ...overrides,
  };
}

const CYCLE_ROW = {
  id: 5,
  orgId: "org-1",
  projectId: 1,
  name: "Q3 Iteration",
  description: null,
  status: "active" as const,
  startDate: "2026-09-01",
  endDate: "2026-09-30",
  createdBy: "user-1",
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
  totalItems: 10,
  completedItems: 5,
  progress: 50,
};

beforeEach(() => {
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseProject.mockReturnValue(
    baseQueryResult({ data: { id: 1, key: "PROJ", statuses: [], settings: null } }),
  );
  mockUseCycles.mockReturnValue(baseQueryResult({ data: [CYCLE_ROW] }));
  mockUseProjectBoardTickets.mockReturnValue(baseQueryResult({ data: [] }));
  mockUseTicketColumnCounts.mockReturnValue(baseQueryResult({ data: {} }));
});

it("renders NoPermissionState when build:cycles:view is denied instead of calling notFound", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseProject.mockReturnValue(baseQueryResult());
  mockUseCycles.mockReturnValue(baseQueryResult());
  mockUseProjectBoardTickets.mockReturnValue(baseQueryResult());
  render(<CycleDetailPage projectId="1" cycleId="5" />);
  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(mockNotFound).not.toHaveBeenCalled();
});

it("renders the cycle kanban when data is present and user is permitted", () => {
  render(<CycleDetailPage projectId="1" cycleId="999" />);
  expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
});

it("renders the loading skeleton when data is being fetched, not denial or empty state", () => {
  mockUseProject.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: undefined, refetch: jest.fn() });
  mockUseCycles.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: undefined, refetch: jest.fn() });
  mockUseProjectBoardTickets.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: undefined, refetch: jest.fn() });
  render(<CycleDetailPage projectId="1" cycleId="5" />);
  expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("renders the error state with the backend message when the cycles query fails", () => {
  mockUseCycles.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: true,
    error: new Error("Failed to load cycle data"),
    refetch: jest.fn(),
  });
  render(<CycleDetailPage projectId="1" cycleId="5" />);
  const errorEl = screen.getByTestId("error-state");
  expect(errorEl.textContent).toContain("Failed to load cycle data");
  expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
});

