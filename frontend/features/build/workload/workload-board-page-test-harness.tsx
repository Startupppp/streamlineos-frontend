import React from "react";
import { render } from "@testing-library/react";

export const mockUse = jest.fn();

jest.mock("react", () => {
  const actual = jest.requireActual<typeof import("react")>("react");
  return { ...actual, use: (...args: unknown[]) => mockUse(...args) };
});

export const mockReplace = jest.fn();
export const mockPush = jest.fn();
let mockSearchParams = new URLSearchParams();

export function setSearchParams(query: string) {
  mockSearchParams = new URLSearchParams(query);
}

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  usePathname: () => "/build/1/workload",
  useSearchParams: () => mockSearchParams,
  notFound: () => null,
}));

export const mockUseProject = jest.fn();

jest.mock("@/hooks/api/build/projects", () => ({
  useProject: (...args: unknown[]) => mockUseProject(...args),
}));

export const mockUseProjectBoardTickets = jest.fn();

jest.mock("@/hooks/api/build/tickets", () => ({
  useProjectBoardTickets: (...args: unknown[]) =>
    mockUseProjectBoardTickets(...args),
}));

export const mockUseWorkloadCapacity = jest.fn((..._args: unknown[]) => new Map());

jest.mock("@/hooks/api/build/workload-capacity", () => ({
  useWorkloadCapacity: (...args: unknown[]) =>
    mockUseWorkloadCapacity(...args),
}));

export const mockUseProjectTeams = jest.fn(
  (..._args: unknown[]): { data: unknown } => ({ data: undefined }),
);

jest.mock("@/hooks/api/build/teams", () => ({
  useProjectTeams: (...args: unknown[]) => mockUseProjectTeams(...args),
}));

export const mockUsePageState = jest.fn(
  (..._args: unknown[]): { kind: string; permission?: string } => ({ kind: "ready" }),
);

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: unknown[]) => mockUsePageState(...args),
}));

export const mockUseOnlineStatus = jest.fn(() => true);

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

export const mockUseBuildListKeyboard = jest.fn((..._args: unknown[]) => ({
  focusedIndex: null,
}));

jest.mock("@/hooks/common/use-build-list-keyboard", () => ({
  useBuildListKeyboard: (...args: unknown[]) =>
    mockUseBuildListKeyboard(...args),
}));

export const captured: {
  filterBarProps: {
    onFilterChange?: (key: string, value: unknown) => void;
    onClearFilters?: () => void;
    filters?: Record<string, unknown>;
  };
  workloadViewGroup?: string;
} = { filterBarProps: {} };

jest.mock("@/features/build/views/workload-filter-bar", () => ({
  WorkloadFilterBar: (props: {
    onFilterChange: (key: string, value: unknown) => void;
    onClearFilters: () => void;
    filters: Record<string, unknown>;
    leading?: React.ReactNode;
  }) => {
    captured.filterBarProps = props;
    return <div data-testid="workload-filter-bar">{props.leading}</div>;
  },
}));


jest.mock("@/features/build/views/workload-view", () => ({
  WorkloadView: (props: { group?: string }) => {
    captured.workloadViewGroup = props.group;
    return <div data-testid="workload-view" />;
  },
}));

jest.mock("@/features/build/views/view-switcher", () => ({
  ViewSwitcher: () => null,
}));

jest.mock("@/components/shared/shortcut-help-dialog", () => ({
  ShortcutHelpDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="shortcut-help-dialog" /> : null,
}));

jest.mock("@/features/build/tickets/create-ticket-dialog", () => ({
  CreateTicketDialog: ({ externalOpen }: { externalOpen: boolean }) =>
    externalOpen ? <div data-testid="create-ticket-dialog" /> : null,
}));

jest.mock("@/features/build/shared/project-load-fallback", () => ({
  ProjectLoadFallback: () => <div data-testid="project-load-fallback" />,
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    loading,
    children,
  }: {
    resolution: { kind: string; permission?: string | null };
    loading: React.ReactNode;
    children: React.ReactNode;
  }) => {
    if (resolution.kind === "loading") return <>{loading}</>;
    if (
      resolution.kind === "denied" ||
      resolution.kind === "module-disabled" ||
      resolution.kind === "module-denied" ||
      resolution.kind === "plan-required"
    )
      return <div data-testid="denied-state" />;
    if (resolution.kind === "error") return <div data-testid="error-state" />;
    return <>{children}</>;
  },
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, filters, actions }: { children: React.ReactNode; filters?: React.ReactNode; actions?: React.ReactNode }) => (
    <div>
      {filters}
      {actions}
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/kanban-skeleton", () => ({
  KanbanBoardSkeleton: () => <div data-testid="kanban-board-skeleton" />,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <span />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="offline-empty-state">{title}</div>
  ),
}));

jest.mock("@/features/build/my-tickets/map-board-ticket", () => ({
  mapBoardTicketToKanban: (t: unknown) => t,
}));

import { WorkloadBoardPage } from "./workload-board-page";

export const READY_PROJECT = {
  data: {
    id: 1,
    name: "My Project",
    key: "TST",
    description: null,
    statuses: [],
    members: [],
  },
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

export const TICKETS_RESULT = {
  data: [],
  isLoading: false,
  isError: false,
  error: null,
};

export function installWorkloadMocks() {
  jest.clearAllMocks();
  captured.filterBarProps = {};
  captured.workloadViewGroup = undefined;
  mockSearchParams = new URLSearchParams();
  mockUse.mockReturnValue({ projectId: "1" });
  mockUseProject.mockReturnValue(READY_PROJECT);
  mockUseProjectBoardTickets.mockReturnValue(TICKETS_RESULT);
  mockUseProjectTeams.mockReturnValue({ data: undefined });
  mockUsePageState.mockReturnValue({ kind: "ready" });
  mockUseOnlineStatus.mockReturnValue(true);
}

export function renderPage() {
  return render(
    <WorkloadBoardPage params={Promise.resolve({ projectId: "1" })} />,
  );
}
