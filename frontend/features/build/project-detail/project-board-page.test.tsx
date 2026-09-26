import React from "react";
import { render, screen } from "@testing-library/react";

const mockNotFound = jest.fn();
const mockUse = jest.fn();

jest.mock("react", () => {
  const actual = jest.requireActual<typeof import("react")>("react");
  return { ...actual, use: (...args: unknown[]) => mockUse(...args) };
});

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build/1/issues",
  useSearchParams: () => new URLSearchParams(),
  notFound: (..._args: unknown[]) => {
    mockNotFound();
    return null;
  },
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useNavigationLeave: () => (action: () => void) => action(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => false),
}));

const mockUseProject = jest.fn();
const mockUseCycles = jest.fn(() => ({ data: [] }));
const mockUseBulkUpdateTickets = jest.fn(() => ({ mutate: jest.fn(), isPending: false }));

jest.mock("@/hooks/api", () => ({
  useProject: (...args: unknown[]) => mockUseProject(...args),
  useCycles: (...args: unknown[]) => mockUseCycles(...args),
  useBulkUpdateTickets: (...args: unknown[]) => mockUseBulkUpdateTickets(...args),
}));

const mockUseWorkloadCapacity = jest.fn(() => ({}));
jest.mock("@/hooks/api/build/workload-capacity", () => ({
  useWorkloadCapacity: (...args: unknown[]) => mockUseWorkloadCapacity(...args),
}));

const mockUseBoardUrlState = jest.fn();
jest.mock("@/features/build/views/use-board-url-state", () => ({
  useBoardUrlState: (...args: unknown[]) => mockUseBoardUrlState(...args),
}));

const mockUseBuildListKeyboard = jest.fn(() => ({ focusedIndex: null }));
jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: (...args: unknown[]) => mockUseBuildListKeyboard(...args),
}));

const mockUsePageState = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: unknown[]) => mockUsePageState(...args),
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
      return (
        <div
          data-testid="denied-state"
          data-permission={
            resolution.kind === "denied"
              ? (resolution as { permission?: string | null }).permission
              : undefined
          }
        />
      );
    if (resolution.kind === "error") return <div data-testid="error-state" />;
    return <>{children}</>;
  },
}));

jest.mock("@/features/build/shared/project-load-fallback", () => ({
  ProjectLoadFallback: () => <div data-testid="project-load-fallback" />,
}));

interface CapturedBoardContentProps {
  onBulkStatus?: (v: string) => void;
  onBulkPriority?: (v: string) => void;
  onBulkAssignee?: (v: string) => void;
  onBulkCycle?: (v: string) => void;
}

let capturedBoardContentProps: CapturedBoardContentProps = {};

jest.mock("@/features/build/views/project-board-content", () => ({
  ProjectBoardContent: (props: CapturedBoardContentProps) => {
    capturedBoardContentProps = props;
    return <div data-testid="project-board-content" />;
  },
}));

jest.mock("@/features/build/views/project-views-toolbar", () => ({
  ProjectViewsToolbar: () => null,
}));

jest.mock("@/features/build/tickets/create-ticket-dialog", () => ({
  CreateTicketDialog: () => null,
}));

jest.mock("@/features/build/ai/project-ai-menu", () => ({
  ProjectAiMenu: () => null,
}));

jest.mock("@/features/build/import-export/components/ticket-import-export-dialog", () => ({
  TicketImportExportDialog: () => null,
}));

jest.mock("@/features/build/views/save-view-dialog", () => ({
  SaveViewDialog: () => null,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/kanban-skeleton", () => ({
  KanbanBoardSkeleton: () => <div data-testid="kanban-board-skeleton" />,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <span />,
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => String(e),
}));

import { ProjectBoardPage } from "./project-board-page";

const BOARD_URL_STATE_DEFAULT = {
  view: "board",
  filterType: undefined,
  filterSeverity: undefined,
  filterQaState: undefined,
  displayOptions: {},
  setDisplayOptions: jest.fn(),
  hideCompleted: false,
  setHideCompleted: jest.fn(),
  workloadFilters: {},
  saveViewOpen: false,
  setSaveViewOpen: jest.fn(),
  saveViewName: "",
  createView: { isPending: false },
  updateView: { isPending: false },
  selectedIds: new Set<number>(),
  ticketsLoading: false,
  ticketsError: false,
  ticketsErrorValue: undefined,
  refetchTickets: jest.fn(),
  isTruncated: false,
  fetchMoreTickets: jest.fn(),
  isFetchingMoreTickets: false,
  filteredTickets: [],
  statuses: [],
  members: [],
  wipLimits: {},
  doneCount: 0,
  showEmptyFilterState: false,
  hasActiveFilters: false,
  boardFilters: {},
  activeView: null,
  createParamOpen: false,
  createDefaultCycleId: undefined,
  handleViewChange: jest.fn(),
  handleClearSearch: jest.fn(),
  handleQaFilterChange: jest.fn(),
  handleClearView: jest.fn(),
  handleCreateOpenChange: jest.fn(),
  handleOpenSaveView: jest.fn(),
  handleSaveViewNameChange: jest.fn(),
  handleSaveView: jest.fn(),
  handleUpdateActiveView: jest.fn(),
  handleWorkloadFilterChange: jest.fn(),
  handleClearWorkloadFilters: jest.fn(),
  handleTicketSelect: jest.fn(),
  handleSelectionChange: jest.fn(),
  handleClearSelection: jest.fn(),
};

const READY_PROJECT = {
  data: { id: 1, name: "My Project", key: "TST", description: null },
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  capturedBoardContentProps = {};
  mockUse.mockReturnValue({ projectId: "1" });
  mockUseProject.mockReturnValue(READY_PROJECT);
  mockUseBoardUrlState.mockReturnValue({ ...BOARD_URL_STATE_DEFAULT });
  mockUsePageState.mockReturnValue({ kind: "ready" });
});

function renderPage() {
  return render(<ProjectBoardPage params={Promise.resolve({ projectId: "1" })} />);
}

describe("ProjectBoardPage — access resolution", () => {
  it("a denied resolution renders the denied surface and not the board content, so a blank page is never the outcome of a permission check", () => {
    mockUseProject.mockReturnValue({ ...READY_PROJECT, data: undefined });
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "build:view" });
    renderPage();
    expect(screen.getByTestId("denied-state")).toBeDefined();
    expect(screen.queryByTestId("project-board-content")).toBeNull();
  });

  it("a denied resolution does not reach notFound even though the project query returned no data, because a gated read is indistinguishable from an empty one (FE-47)", () => {
    mockUseProject.mockReturnValue({ ...READY_PROJECT, data: undefined });
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "build:view" });
    renderPage();
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  it("an access-check still resolving renders the kanban skeleton and not the denial surface, so a permitted user never sees a denial flash", () => {
    mockUsePageState.mockReturnValue({ kind: "loading" });
    renderPage();
    expect(screen.getByTestId("kanban-board-skeleton")).toBeDefined();
    expect(screen.queryByTestId("denied-state")).toBeNull();
  });

  it("a ready resolution with a real project renders the board content and not the skeleton", () => {
    renderPage();
    expect(screen.getByTestId("project-board-content")).toBeDefined();
    expect(screen.queryByTestId("kanban-board-skeleton")).toBeNull();
  });
});

describe("ProjectBoardPage — project error path", () => {
  it("a project read failure renders the ProjectLoadFallback retry surface and not the generic error state, because a failed read is not the same fact as a project that is gone", () => {
    mockUseProject.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("network error"),
      refetch: jest.fn(),
    });
    renderPage();
    expect(screen.getByTestId("project-load-fallback")).toBeDefined();
    expect(screen.queryByTestId("error-state")).toBeNull();
  });
});

describe("ProjectBoardPage — usePageState inputs", () => {
  it("passes the error value to usePageState so a 402 shows the upgrade path rather than a generic message (FE-41)", () => {
    const projectErr = new Error("payment required");
    mockUseProject.mockReturnValue({
      ...READY_PROJECT,
      isError: true,
      error: projectErr,
      data: undefined,
    });
    renderPage();
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ isError: true, error: projectErr }),
    );
  });
});

describe("ProjectBoardPage — 403 routing", () => {
  it("a 403 on the project fetch renders the denied surface and not the ProjectLoadFallback, because a permission denial must not look like a network error", () => {
    mockUseProject.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("forbidden"),
      refetch: jest.fn(),
    });
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "build:view" });
    renderPage();
    expect(screen.getByTestId("denied-state")).toBeDefined();
    expect(screen.queryByTestId("project-load-fallback")).toBeNull();
  });
});

describe("ProjectBoardPage — bulk actions", () => {
  it("calls bulkMutate with the selected ticket ids and the new status when onBulkStatus fires on the board content, so a status change covers every selected row", () => {
    const bulkMutate = jest.fn();
    mockUseBulkUpdateTickets.mockReturnValue({ mutate: bulkMutate, isPending: false });
    mockUseBoardUrlState.mockReturnValue({
      ...BOARD_URL_STATE_DEFAULT,
      selectedIds: new Set([1, 2]),
    });
    renderPage();
    capturedBoardContentProps.onBulkStatus?.("DONE");
    expect(bulkMutate).toHaveBeenCalledWith(
      { ticketIds: [1, 2], status: "DONE" },
      expect.any(Object),
    );
  });

  it("does not call bulkMutate when no tickets are selected and onBulkStatus fires, to prevent empty bulk mutations", () => {
    const bulkMutate = jest.fn();
    mockUseBulkUpdateTickets.mockReturnValue({ mutate: bulkMutate, isPending: false });
    mockUseBoardUrlState.mockReturnValue({
      ...BOARD_URL_STATE_DEFAULT,
      selectedIds: new Set<number>(),
    });
    renderPage();
    capturedBoardContentProps.onBulkStatus?.("DONE");
    expect(bulkMutate).not.toHaveBeenCalled();
  });

  it("calls bulkMutate with the selected ticket ids and the new priority when onBulkPriority fires with a valid priority value", () => {
    const bulkMutate = jest.fn();
    mockUseBulkUpdateTickets.mockReturnValue({ mutate: bulkMutate, isPending: false });
    mockUseBoardUrlState.mockReturnValue({
      ...BOARD_URL_STATE_DEFAULT,
      selectedIds: new Set([3]),
    });
    renderPage();
    capturedBoardContentProps.onBulkPriority?.("HIGH");
    expect(bulkMutate).toHaveBeenCalledWith(
      { ticketIds: [3], priority: "HIGH" },
      expect.any(Object),
    );
  });

  it("calls bulkMutate with the selected ticket ids and the assigneeId when onBulkAssignee fires", () => {
    const bulkMutate = jest.fn();
    mockUseBulkUpdateTickets.mockReturnValue({ mutate: bulkMutate, isPending: false });
    mockUseBoardUrlState.mockReturnValue({
      ...BOARD_URL_STATE_DEFAULT,
      selectedIds: new Set([5, 6]),
    });
    renderPage();
    capturedBoardContentProps.onBulkAssignee?.("user-abc");
    expect(bulkMutate).toHaveBeenCalledWith(
      { ticketIds: [5, 6], assigneeId: "user-abc" },
      expect.any(Object),
    );
  });
});

describe("ProjectBoardPage — workload capacity", () => {
  it("passes enabled:true to useWorkloadCapacity only when the view is workload, so capacity is not fetched on the issues view", () => {
    mockUseBoardUrlState.mockReturnValue({ ...BOARD_URL_STATE_DEFAULT, view: "list" });
    renderPage();
    expect(mockUseWorkloadCapacity).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ enabled: false }),
    );
  });

  it("passes enabled:true to useWorkloadCapacity when the view is workload", () => {
    mockUseBoardUrlState.mockReturnValue({ ...BOARD_URL_STATE_DEFAULT, view: "workload" });
    renderPage();
    expect(mockUseWorkloadCapacity).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ enabled: true }),
    );
  });
});

describe("ProjectBoardPage — keyboard navigation", () => {
  it("enables keyboard navigation only for the list view so j/k navigation does not conflict with kanban card interactions", () => {
    mockUseBoardUrlState.mockReturnValue({ ...BOARD_URL_STATE_DEFAULT, view: "board" });
    renderPage();
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it("enables keyboard navigation when the view is list", () => {
    mockUseBoardUrlState.mockReturnValue({ ...BOARD_URL_STATE_DEFAULT, view: "list" });
    renderPage();
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );
  });

  it("passes an onCreate handler to useBuildListKeyboard so the c keyboard shortcut opens the create-ticket dialog without a separate keydown listener", () => {
    renderPage();
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ onCreate: expect.any(Function) }),
    );
  });

  it("passes a searchInputRef to useBuildListKeyboard so the / shortcut focuses the search input instead of being a no-op", () => {
    renderPage();
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ searchInputRef: expect.objectContaining({ current: null }) }),
    );
  });

  it("passes an onEdit handler to useBuildListKeyboard so the e shortcut opens the focused ticket for editing", () => {
    renderPage();
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ onEdit: expect.any(Function) }),
    );
  });

  it("passes an onShortcutHelp handler to useBuildListKeyboard so the ? shortcut opens the shortcut help dialog", () => {
    renderPage();
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ onShortcutHelp: expect.any(Function) }),
    );
  });
});
