import React from "react";
import { render, screen, act } from "@testing-library/react";
import { EpicsPage } from "./epics-page";

jest.mock("@/hooks/api/build", () => ({
  useProject: jest.fn(),
  useProjectBoardTickets: jest.fn(),
  useUpdateTicket: jest.fn(),
  useDeleteTicket: jest.fn(),
  useCreateTicket: jest.fn(),
  useBulkUpdateTickets: jest.fn(),
  useCycles: jest.fn(),
  useProjectMembers: jest.fn(() => ({ data: [] })),
}));

jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  useBuildListFilters: jest.fn(),
}));

jest.mock("@/features/build/shared/build-list-toolbar", () => ({
  BuildListToolbar: () => <div data-testid="build-list-toolbar" />,
}));

jest.mock("@/features/build/shared/bulk-action-bar", () => ({
  BulkActionBar: ({ selectedCount }: { selectedCount: number }) => (
    <div data-testid="bulk-action-bar">{selectedCount}</div>
  ),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/features/build/shared/module-disabled-state", () => ({
  ModuleDisabledState: () => <div data-testid="module-disabled" />,
}));

jest.mock("@/features/build/shared/completed-status", () => ({
  getCompletedStatusNames: () => new Set<string>(),
}));

jest.mock("@/features/build/epics/create-epic-dialog", () => ({
  CreateEpicDialog: () => <div data-testid="create-epic-dialog" />,
}));

jest.mock("@/features/build/epics/epic-card", () => ({
  EpicCard: () => <div data-testid="epic-card" />,
}));

jest.mock("@/features/build/epics/epic-story-row", () => ({
  EpicStoryRow: () => <div data-testid="epic-story-row" />,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div>{title ? <h1>{title}</h1> : null}{children}</div>
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
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

jest.mock("@/components/ui/stat-card", () => ({
  StatCard: () => <div data-testid="stat-card" />,
  StatCardGrid: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  StatCardGridSkeleton: () => <div data-testid="stat-card-grid-skeleton" />,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PmPanel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PmSection: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PmStaggerList: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PM_FILL_PANEL: "",
}));

jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: jest.fn(() => ({ focusedIndex: null, setFocusedIndex: jest.fn() })),
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...rest
    }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

import { useProject, useProjectBoardTickets, useUpdateTicket, useDeleteTicket, useCreateTicket, useBulkUpdateTickets, useCycles } from "@/hooks/api/build";
import { useCan, useAccess } from "@/hooks/api/access";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";

const mockUseProject = useProject as jest.Mock;
const mockUseProjectBoardTickets = useProjectBoardTickets as jest.Mock;
const mockUseUpdateTicket = useUpdateTicket as jest.Mock;
const mockUseDeleteTicket = useDeleteTicket as jest.Mock;
const mockUseCreateTicket = useCreateTicket as jest.Mock;
const mockUseBulkUpdateTickets = useBulkUpdateTickets as jest.Mock;
const mockUseCycles = useCycles as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;
const mockUseBuildListKeyboard = useBuildListKeyboard as jest.Mock;
const mockUseBuildListFilters = useBuildListFilters as jest.Mock;

const ACCESS_LOADING = { data: undefined, isLoading: true };
const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:view": "all", "build:tickets:view": "all", "build:tickets:create": "all" }, modules: { BUILD: true } },
  isLoading: false,
};
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: { BUILD: true } },
  isLoading: false,
};

const disabledQueryResult = () => ({ data: undefined, isLoading: false, isError: false, error: undefined, refetch: jest.fn() });

function makeMutationResult() {
  return { mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false };
}

beforeEach(() => {
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseProject.mockReturnValue({
    data: { id: 1, key: "TEST", statuses: [], settings: { modules: {} } },
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });
  mockUseProjectBoardTickets.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });
  mockUseUpdateTicket.mockReturnValue(makeMutationResult());
  mockUseDeleteTicket.mockReturnValue(makeMutationResult());
  mockUseCreateTicket.mockReturnValue(makeMutationResult());
  mockUseBulkUpdateTickets.mockReturnValue(makeMutationResult());
  mockUseCycles.mockReturnValue({ data: [] });
  mockUseBuildListKeyboard.mockReturnValue({ focusedIndex: null, setFocusedIndex: jest.fn() });
  mockUseBuildListFilters.mockReturnValue({ search: "", debouncedSearch: "", setSearch: jest.fn(), value: jest.fn(() => ""), setValue: jest.fn(), clearAll: jest.fn(), activeCount: 0, isFiltered: false });
});

const params = Promise.resolve({ projectId: "1" });

it("shows skeleton not empty state while access snapshot is still in flight because queries are disabled until snapshot lands", async () => {
  mockUseAccess.mockReturnValue(ACCESS_LOADING);
  mockUseCan.mockReturnValue(false);
  mockUseProject.mockReturnValue(disabledQueryResult());
  mockUseProjectBoardTickets.mockReturnValue(disabledQueryResult());

  await act(async () => {
    render(<EpicsPage params={params} />);
  });

  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
});

it("shows NoPermissionState not empty state when build:view is denied", async () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseCan.mockReturnValue(false);
  mockUseProject.mockReturnValue(disabledQueryResult());
  mockUseProjectBoardTickets.mockReturnValue(disabledQueryResult());

  await act(async () => {
    render(<EpicsPage params={params} />);
  });

  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("renders the error state with the backend message on data fetch failure, not a generic fallback", async () => {
  mockUseProjectBoardTickets.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: true,
    error: new Error("Failed to load tickets"),
    refetch: jest.fn(),
  });

  await act(async () => {
    render(<EpicsPage params={params} />);
  });

  const errorEl = screen.getByTestId("error-state");
  expect(errorEl.textContent).toContain("Failed to load tickets");
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("renders the empty state when there are no epics, distinguishing setup from filtered no-result", async () => {
  mockUseProjectBoardTickets.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });

  await act(async () => {
    render(<EpicsPage params={params} />);
  });

  expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  expect(screen.queryByTestId("epic-card")).not.toBeInTheDocument();
  expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
});

it("renders epic cards when epics are present and user has view access", async () => {
  const epicTicket = {
    id: 1, orgId: "org-1", projectId: 1, title: "Epic A", type: "EPIC",
    status: "TODO", priority: "MEDIUM", ticketNumber: 1, epicId: null,
    reporterId: "user-1", points: null, storyPoints: null, link: null,
    rank: "1000", parentTicketId: null, originalEstimate: null, timeSpent: null,
    startDate: null, dueDate: null, moduleId: null, cycleId: null,
    sequenceId: "PROJ-1", estimate: null, createdAt: "2026-09-01", updatedAt: "2026-09-01",
  };
  mockUseProjectBoardTickets.mockReturnValue({
    data: [epicTicket],
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });

  await act(async () => {
    render(<EpicsPage params={params} />);
  });

  expect(screen.getByTestId("epic-card")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("enables keyboard navigation bound to the epic count when epics are present and access is granted", async () => {
  const epicTicket = {
    id: 2, orgId: "org-1", projectId: 1, title: "Epic B", type: "EPIC",
    status: "TODO", priority: "MEDIUM", ticketNumber: 2, epicId: null,
    reporterId: "user-1", points: null, storyPoints: null, link: null,
    rank: "1001", parentTicketId: null, originalEstimate: null, timeSpent: null,
    startDate: null, dueDate: null, moduleId: null, cycleId: null,
    sequenceId: "PROJ-2", estimate: null, createdAt: "2026-09-01", updatedAt: "2026-09-01",
  };
  mockUseProjectBoardTickets.mockReturnValue({
    data: [epicTicket],
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });

  await act(async () => {
    render(<EpicsPage params={params} />);
  });

  const calls = mockUseBuildListKeyboard.mock.calls;
  const lastArgs = calls[calls.length - 1]?.[0];
  expect(lastArgs?.enabled).toBe(true);
  expect(lastArgs?.itemCount).toBe(1);
});
