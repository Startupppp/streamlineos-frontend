import React from "react";
import { render, screen } from "@testing-library/react";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";
import { ProjectSettingsAccessPage } from "./project-settings-access-page";

const mockRefetch = jest.fn();

let mockProjectMembers = {
  data: { data: [], pagination: { limit: 25, hasMore: false, nextCursor: null } } as
    | { data: { id: number; userId: string; role: string; email: string; firstName: string | null; lastName: string | null }[]; pagination: { limit: number; hasMore: boolean; nextCursor: string | null } }
    | undefined,
  isLoading: false,
  isError: false,
  error: null as unknown,
  refetch: mockRefetch,
};

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => false),
  useCanState: jest.fn(() => "granted"),
}));

const mockUsePageState = jest.fn<PageStateResolution, [unknown]>();

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (opts: unknown) => mockUsePageState(opts),
}));

jest.mock("@/hooks/api/build/project-members", () => ({
  useProjectMembers: () => mockProjectMembers,
}));

jest.mock("@/features/build/settings/project-member-roles-section", () => ({
  ProjectMemberRolesSection: () => (
    <div data-testid="project-member-roles-section" />
  ),
}));

jest.mock("@/features/build/settings/team-roster-section", () => ({
  TeamRosterSection: () => <div data-testid="team-roster-section" />,
}));

jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  useBuildListFilters: () => ({
    search: "",
    debouncedSearch: "",
    cursor: null,
    setSearch: jest.fn(),
    setCursor: jest.fn(),
    value: () => "all",
    isActive: () => false,
    setValue: jest.fn(),
    clearAll: jest.fn(),
    activeCount: 0,
    isFiltered: false,
    resetKey: "",
    isPending: false,
  }),
}));

const mockUseBuildListKeyboard = jest.fn();

jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: (...args: unknown[]) => mockUseBuildListKeyboard(...args),
}));

jest.mock("@/features/build/shared/build-list-toolbar", () => ({
  BuildListToolbar: () => null,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "",
}));

jest.mock("@/components/ui/data-table-skeleton", () => ({
  DataTableSkeleton: () => <div data-testid="member-loading-skeleton" />,
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    children,
    loading,
  }: {
    resolution: PageStateResolution;
    children: React.ReactNode;
    loading?: React.ReactNode;
  }) => {
    if (resolution.kind === "denied") return <div data-testid="no-permission" />;
    if (resolution.kind === "loading") return <div data-testid="page-loading">{loading}</div>;
    if (resolution.kind === "error") return <div data-testid="error-state" />;
    if (resolution.kind === "empty") return <div data-testid="empty-state" />;
    return <div data-testid="page-ready">{children}</div>;
  },
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    filters,
  }: {
    children: React.ReactNode;
    filters?: React.ReactNode;
  }) => (
    <div>
      {filters}
      {children}
    </div>
  ),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockRefetch.mockResolvedValue(undefined);
  mockProjectMembers = {
    data: { data: [], pagination: { limit: 25, hasMore: false, nextCursor: null } },
    isLoading: false,
    isError: false,
    error: null,
    refetch: mockRefetch,
  };
  mockUsePageState.mockReturnValue({ kind: "ready" });
  mockUseBuildListKeyboard.mockReturnValue({ focusedIndex: null, setFocusedIndex: jest.fn() });
});

describe("ProjectSettingsAccessPage — usePageState integration (FE-40, FE-41)", () => {
  it("passes build:members:view permission to usePageState so 402 upgradePath is preserved", () => {
    render(<ProjectSettingsAccessPage projectId={1} />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:members:view" }),
    );
  });

  it("forwards isLoading from useProjectMembers to usePageState so the skeleton shows during a real fetch", () => {
    mockProjectMembers = { ...mockProjectMembers, isLoading: true, data: undefined };
    render(<ProjectSettingsAccessPage projectId={1} />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ isLoading: true }),
    );
  });

  it("forwards isError from useProjectMembers to usePageState so the error state is reachable", () => {
    const err = new Error("fetch failed");
    mockProjectMembers = { ...mockProjectMembers, isError: true, error: err };
    render(<ProjectSettingsAccessPage projectId={1} />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ isError: true, error: err }),
    );
  });

  it("passes isLoading: false when the hook is not loading", () => {
    mockProjectMembers = { ...mockProjectMembers, isLoading: false };
    render(<ProjectSettingsAccessPage projectId={1} />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ isLoading: false }),
    );
  });

  it("passes isError: false when the hook has no error", () => {
    mockProjectMembers = { ...mockProjectMembers, isError: false };
    render(<ProjectSettingsAccessPage projectId={1} />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ isError: false }),
    );
  });
});

describe("ProjectSettingsAccessPage — access control (BLD-X-FE-SETTINGS-ACCESS-001)", () => {
  it("renders NoPermissionState when access is denied — PageState gates on build:members:view", () => {
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "build:members:view" });
    render(<ProjectSettingsAccessPage projectId={1} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByTestId("project-member-roles-section")).not.toBeInTheDocument();
  });

  it("renders member sections when access is granted", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    render(<ProjectSettingsAccessPage projectId={1} />);
    expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
    expect(screen.getByTestId("project-member-roles-section")).toBeInTheDocument();
    expect(screen.getByTestId("team-roster-section")).toBeInTheDocument();
  });

  it("does not leak existence of member data to denied viewers — no section heading visible", () => {
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "build:members:view" });
    render(<ProjectSettingsAccessPage projectId={1} />);
    expect(screen.queryByText(/member roles/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/teams/i)).not.toBeInTheDocument();
  });
});

describe("ProjectSettingsAccessPage — loading state (BLD-X-FE-SETTINGS-ACCESS-002)", () => {
  it("renders the loading skeleton when resolution is loading and not member sections", () => {
    mockUsePageState.mockReturnValue({ kind: "loading" });
    render(<ProjectSettingsAccessPage projectId={1} />);
    expect(screen.getByTestId("page-loading")).toBeInTheDocument();
    expect(screen.getByTestId("member-loading-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("project-member-roles-section")).not.toBeInTheDocument();
    expect(screen.queryByTestId("team-roster-section")).not.toBeInTheDocument();
  });
});

describe("ProjectSettingsAccessPage — error state (BLD-X-FE-SETTINGS-ACCESS-003)", () => {
  it("routes an error resolution to PageState so the error state is rendered instead of member sections", () => {
    mockUsePageState.mockReturnValue({ kind: "error", error: new Error("network") });
    render(<ProjectSettingsAccessPage projectId={1} />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.queryByTestId("project-member-roles-section")).not.toBeInTheDocument();
  });
});

describe("ProjectSettingsAccessPage — keyboard shortcuts (Requirement C3)", () => {
  it("wires useBuildListKeyboard with onClearSelection so Esc clears the search filter", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    render(<ProjectSettingsAccessPage projectId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ onClearSelection: expect.any(Function) }),
    );
  });

  it("passes searchInputRef to useBuildListKeyboard so the / key focuses the search input", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    render(<ProjectSettingsAccessPage projectId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ searchInputRef: expect.anything() }),
    );
  });

  it("passes itemCount from members data so j/k nav has a correct upper bound", () => {
    mockProjectMembers = {
      ...mockProjectMembers,
      data: {
        data: [
          { id: 1, userId: "u1", role: "member", email: "a@test.com", firstName: null, lastName: null },
          { id: 2, userId: "u2", role: "admin", email: "b@test.com", firstName: null, lastName: null },
        ],
        pagination: { limit: 25, hasMore: false, nextCursor: null },
      },
    };
    render(<ProjectSettingsAccessPage projectId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ itemCount: 2 }),
    );
  });
});
