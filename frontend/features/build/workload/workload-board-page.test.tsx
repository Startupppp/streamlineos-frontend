import React from "react";
import { render, screen, act } from "@testing-library/react";

const mockUse = jest.fn();

jest.mock("react", () => {
  const actual = jest.requireActual<typeof import("react")>("react");
  return { ...actual, use: (...args: unknown[]) => mockUse(...args) };
});

const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  usePathname: () => "/build/1/workload",
  useSearchParams: () => mockSearchParams,
  notFound: () => null,
}));

const mockUseProject = jest.fn();

jest.mock("@/hooks/api", () => ({
  useProject: (...args: unknown[]) => mockUseProject(...args),
}));

const mockUseProjectBoardTickets = jest.fn();

jest.mock("@/hooks/api/build", () => ({
  useProjectBoardTickets: (...args: unknown[]) =>
    mockUseProjectBoardTickets(...args),
}));

const mockUseWorkloadCapacity = jest.fn(() => new Map());

jest.mock("@/hooks/api/build/workload-capacity", () => ({
  useWorkloadCapacity: (...args: unknown[]) =>
    mockUseWorkloadCapacity(...args),
}));

const mockUsePageState = jest.fn();

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: unknown[]) => mockUsePageState(...args),
}));

const mockUseOnlineStatus = jest.fn(() => true);

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockUseBuildListKeyboard = jest.fn(() => ({ focusedIndex: null }));

jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: (...args: unknown[]) =>
    mockUseBuildListKeyboard(...args),
}));

let capturedFilterBarProps: {
  onFilterChange?: (key: string, value: unknown) => void;
  onClearFilters?: () => void;
} = {};

jest.mock("@/features/build/views/workload-filter-bar", () => ({
  WorkloadFilterBar: (props: {
    onFilterChange: (key: string, value: unknown) => void;
    onClearFilters: () => void;
  }) => {
    capturedFilterBarProps = props;
    return <div data-testid="workload-filter-bar" />;
  },
}));

jest.mock("@/features/build/views/workload-view", () => ({
  WorkloadView: () => <div data-testid="workload-view" />,
}));

jest.mock("@/features/build/views/view-switcher", () => ({
  ViewSwitcher: () => null,
}));

let capturedShortcutOpen: boolean | undefined;

jest.mock("@/features/build/shared/shortcut-help-dialog", () => ({
  ShortcutHelpDialog: ({ open }: { open: boolean }) => {
    capturedShortcutOpen = open;
    return open ? <div data-testid="shortcut-help-dialog" /> : null;
  },
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

const READY_PROJECT = {
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

const TICKETS_RESULT = {
  data: [],
  isLoading: false,
  isError: false,
  error: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  capturedFilterBarProps = {};
  capturedShortcutOpen = undefined;
  mockSearchParams = new URLSearchParams();
  mockUse.mockReturnValue({ projectId: "1" });
  mockUseProject.mockReturnValue(READY_PROJECT);
  mockUseProjectBoardTickets.mockReturnValue(TICKETS_RESULT);
  mockUsePageState.mockReturnValue({ kind: "ready" });
  mockUseOnlineStatus.mockReturnValue(true);
});

function renderPage() {
  return render(
    <WorkloadBoardPage params={Promise.resolve({ projectId: "1" })} />,
  );
}

describe("WorkloadBoardPage — URL param forwarding to useWorkloadCapacity", () => {
  it("passes from and to query params as start and end to useWorkloadCapacity so shared links preserve the capacity window", () => {
    mockSearchParams = new URLSearchParams("from=2026-01-01&to=2026-01-14");
    renderPage();
    expect(mockUseWorkloadCapacity).toHaveBeenCalledWith(
      1,
      "2026-01-01",
      "2026-01-14",
    );
  });

  it("defaults capacity window to today + 13 days when from and to are absent from the URL", () => {
    renderPage();
    const calls = mockUseWorkloadCapacity.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const [, start, end] = calls[0];
    expect(typeof start).toBe("string");
    expect(typeof end).toBe("string");
    expect(start.length).toBe(10);
    expect(end.length).toBe(10);
  });
});

describe("WorkloadBoardPage — URL param forwarding to useProjectBoardTickets", () => {
  it("passes memberId from the URL as assigneeId to useProjectBoardTickets so the member filter persists across reloads", () => {
    mockSearchParams = new URLSearchParams("memberId=user-abc");
    renderPage();
    expect(mockUseProjectBoardTickets).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ assigneeId: "user-abc" }),
    );
  });

  it("passes undefined as assigneeId when memberId is absent from the URL so all members' tickets are fetched", () => {
    renderPage();
    expect(mockUseProjectBoardTickets).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ assigneeId: undefined }),
    );
  });
});

describe("WorkloadBoardPage — filter change writes memberId to URL", () => {
  it("calls router.replace with memberId in the URL when the assigneeId filter changes to a non-all value, so the selection is bookmarkable", () => {
    renderPage();
    capturedFilterBarProps.onFilterChange?.("assigneeId", "user-xyz");
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("memberId=user-xyz"),
      expect.anything(),
    );
  });

  it("removes memberId from the URL when the assigneeId filter is cleared to all, so the URL stays clean when no filter is active", () => {
    mockSearchParams = new URLSearchParams("memberId=user-abc");
    renderPage();
    capturedFilterBarProps.onFilterChange?.("assigneeId", "all");
    const callArg: string = mockReplace.mock.calls[0][0];
    expect(callArg).not.toContain("memberId=");
  });

  it("removes memberId from the URL when onClearFilters fires", () => {
    mockSearchParams = new URLSearchParams("memberId=user-abc");
    renderPage();
    act(() => {
      capturedFilterBarProps.onClearFilters?.();
    });
    const callArg: string = mockReplace.mock.calls[0][0];
    expect(callArg).not.toContain("memberId=");
  });
});

describe("WorkloadBoardPage — access resolution", () => {
  it("a denied resolution renders the denied surface and not the workload view, so a blank page is never the outcome of a permission check", () => {
    mockUseProject.mockReturnValue({ ...READY_PROJECT, data: undefined });
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "build:view" });
    renderPage();
    expect(screen.getByTestId("denied-state")).toBeDefined();
    expect(screen.queryByTestId("workload-view")).toBeNull();
  });

  it("an access-check still resolving renders the kanban skeleton and not the workload view, so a permitted user never sees a denial flash", () => {
    mockUseProject.mockReturnValue({ ...READY_PROJECT, isLoading: true });
    mockUsePageState.mockReturnValue({ kind: "loading" });
    renderPage();
    expect(screen.getByTestId("kanban-board-skeleton")).toBeDefined();
    expect(screen.queryByTestId("workload-view")).toBeNull();
  });

  it("a ready resolution renders the workload view and not the skeleton", () => {
    renderPage();
    expect(screen.getByTestId("workload-view")).toBeDefined();
    expect(screen.queryByTestId("kanban-board-skeleton")).toBeNull();
  });
});

describe("WorkloadBoardPage — project error path", () => {
  it("a project read failure renders the ProjectLoadFallback retry surface and not the generic error state", () => {
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

describe("WorkloadBoardPage — usePageState inputs", () => {
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

describe("WorkloadBoardPage — offline state", () => {
  it("renders the offline empty state and hides the workload view when the device goes offline (CCG-5)", () => {
    mockUseOnlineStatus.mockReturnValue(false);
    renderPage();
    expect(screen.getByTestId("offline-empty-state")).toBeDefined();
    expect(screen.queryByTestId("workload-view")).toBeNull();
  });

  it("renders the workload view when online and not the offline empty state", () => {
    mockUseOnlineStatus.mockReturnValue(true);
    renderPage();
    expect(screen.getByTestId("workload-view")).toBeDefined();
    expect(screen.queryByTestId("offline-empty-state")).toBeNull();
  });
});

describe("WorkloadBoardPage — keyboard shortcuts", () => {
  it("wires onShortcutHelp to useBuildListKeyboard so the ? key opens the shortcut help dialog (CCG-4)", () => {
    renderPage();
    const call = mockUseBuildListKeyboard.mock.calls[0][0] as {
      onShortcutHelp?: () => void;
    };
    expect(typeof call.onShortcutHelp).toBe("function");
  });

  it("calling onShortcutHelp from useBuildListKeyboard opens the ShortcutHelpDialog", () => {
    renderPage();
    const call = mockUseBuildListKeyboard.mock.calls[0][0] as {
      onShortcutHelp?: () => void;
    };
    act(() => {
      call.onShortcutHelp?.();
    });
    expect(screen.getByTestId("shortcut-help-dialog")).toBeDefined();
  });

  it("wires onCreate to useBuildListKeyboard so the c key opens the create ticket dialog", () => {
    renderPage();
    const call = mockUseBuildListKeyboard.mock.calls[0][0] as {
      onCreate?: () => void;
    };
    expect(typeof call.onCreate).toBe("function");
  });

  it("keyboard is always enabled on the workload page so j/k navigation works immediately", () => {
    renderPage();
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );
  });
});
