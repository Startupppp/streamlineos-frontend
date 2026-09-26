import React from "react";
import { render, screen } from "@testing-library/react";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";
import type { ProjectTeamMember } from "@/types/projects";
import { TeamHomePage } from "./team-home-page";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  usePathname: () => "/build/teams/1",
  useSearchParams: () => new URLSearchParams(),
}));

const mockUsePageState = jest.fn<PageStateResolution, [unknown]>();
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (opts: unknown) => mockUsePageState(opts),
}));

const mockUseCan = jest.fn(() => false);
jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockUseCan(key),
  useCanState: jest.fn(() => "granted"),
}));

const BASE_TEAM = {
  id: 1,
  name: "Acme Squad",
  key: "AS",
  icon: null,
  color: null,
  isPrivate: false,
  members: [] as ProjectTeamMember[],
};

type TeamData = typeof BASE_TEAM;

let mockTeamResult = {
  data: undefined as TeamData | undefined,
  isLoading: false,
  isError: false,
  error: null as unknown,
  refetch: jest.fn(),
};

let mockMembersResult = {
  data: {
    data: [] as ProjectTeamMember[],
    pagination: { limit: 25, hasMore: false, nextCursor: null },
  } as
    | { data: ProjectTeamMember[]; pagination: { limit: number; hasMore: boolean; nextCursor: string | null } }
    | undefined,
  isLoading: false,
};

jest.mock("@/hooks/api/build/teams", () => ({
  useProjectTeam: () => mockTeamResult,
  useTeamMembers: () => mockMembersResult,
  useUpdateProjectTeam: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteProjectTeam: () => ({ mutate: jest.fn(), isPending: false }),
  useAddProjectTeamMember: () => ({ mutate: jest.fn(), isPending: false }),
  useRemoveProjectTeamMember: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateProjectTeamMemberRole: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/components/ui/table-pagination", () => ({
  useCursorPager: () => ({
    cursor: null,
    hasPrevious: false,
    goNext: jest.fn(),
    goPrevious: jest.fn(),
    reset: jest.fn(),
  }),
}));

const mockUseBuildListKeyboard = jest.fn();
jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: (args: unknown) => mockUseBuildListKeyboard(args),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    loading,
    children,
  }: {
    resolution: PageStateResolution;
    loading?: React.ReactNode;
    children: React.ReactNode;
  }) => {
    if (resolution.kind === "loading") return <div data-testid="page-loading">{loading}</div>;
    if (resolution.kind === "denied") return <div data-testid="no-permission" />;
    if (resolution.kind === "error") return <div data-testid="error-state" />;
    return <>{children}</>;
  },
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    actions,
    title,
  }: {
    children: React.ReactNode;
    actions?: React.ReactNode;
    title?: string;
  }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {actions}
      {children}
    </div>
  ),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children, role, "aria-label": ariaLabel }: { children: React.ReactNode; role?: string; "aria-label"?: string }) => (
    <div role={role} aria-label={ariaLabel}>{children}</div>
  ),
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_PANEL: "",
  PM_ROW: "",
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title?: string }) => (
    <div data-testid="empty-state">{title ?? ""}</div>
  ),
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({ children, isPending: _p, ...props }: { children?: React.ReactNode; isPending?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarImage: () => null,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({ open, title }: { open: boolean; title?: string }) =>
    open ? <div data-testid="confirm-dialog">{title}</div> : null,
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="team-actions-trigger">{children}</div>,
}));

jest.mock("@/features/build/teams/team-form-sheet", () => ({
  TeamFormSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="team-form-sheet" /> : null,
}));

jest.mock("@/features/build/teams/team-projects-section", () => ({
  TeamProjectsSection: () => <div data-testid="team-projects-section" />,
}));

jest.mock("@/components/members/member-picker", () => ({
  MemberPicker: () => <div data-testid="member-picker" />,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: () => null,
  XIcon: () => null,
  EllipsisIcon: () => null,
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => String(e),
}));

jest.mock("@/lib/person-display", () => ({
  getUserDisplayName: ({ email }: { email?: string; firstName?: string | null; lastName?: string | null }) =>
    email ?? "User",
  getUserInitials: () => "U",
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
  resolveImageUrl: (u: string | null | undefined) => u ?? null,
}));

jest.mock("@/lib/text-overflow", () => ({
  TEXT_ONE_LINE: "",
}));

const MEMBER_A: ProjectTeamMember = {
  id: 10,
  userId: "uid-a",
  role: "lead",
  email: "alice@example.com",
  firstName: "Alice",
  lastName: "Smith",
  image: null,
};

const MEMBER_B: ProjectTeamMember = {
  id: 11,
  userId: "uid-b",
  role: "member",
  email: "bob@example.com",
  firstName: "Bob",
  lastName: "Jones",
  image: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPush.mockReset();
  mockUseCan.mockReturnValue(false);
  mockTeamResult = {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
  mockMembersResult = {
    data: { data: [], pagination: { limit: 25, hasMore: false, nextCursor: null } },
    isLoading: false,
  };
  mockUsePageState.mockReturnValue({ kind: "ready" });
  mockUseBuildListKeyboard.mockReset();
});

describe("TeamHomePage — usePageState integration (FE-40, FE-41)", () => {
  it("passes build:teams:view permission to usePageState so 402 errors classify correctly", () => {
    render(<TeamHomePage teamId={1} />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:teams:view" }),
    );
  });

  it("forwards isLoading from useProjectTeam to usePageState", () => {
    mockTeamResult = { ...mockTeamResult, isLoading: true, data: undefined };
    render(<TeamHomePage teamId={1} />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ isLoading: true }),
    );
  });

  it("forwards isError and error from useProjectTeam to usePageState so MODULE_NOT_ENABLED 402 surfaces", () => {
    const err = new Error("MODULE_NOT_ENABLED");
    mockTeamResult = { ...mockTeamResult, isError: true, error: err };
    render(<TeamHomePage teamId={1} />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ isError: true, error: err }),
    );
  });

  it("passes isEmpty: true to usePageState when team data is absent so empty and denied are not conflated", () => {
    mockTeamResult = { ...mockTeamResult, data: undefined };
    render(<TeamHomePage teamId={1} />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ isEmpty: true }),
    );
  });

  it("passes isEmpty: false to usePageState when team data is present", () => {
    mockTeamResult = { ...mockTeamResult, data: { ...BASE_TEAM } };
    render(<TeamHomePage teamId={1} />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ isEmpty: false }),
    );
  });
});

describe("TeamHomePage — loading state (BLD-X-FE-TEAMS-DETAIL-001)", () => {
  it("renders the loading skeleton when resolution is loading and not team content", () => {
    mockUsePageState.mockReturnValue({ kind: "loading" });
    render(<TeamHomePage teamId={1} />);
    expect(screen.getByTestId("page-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("team-projects-section")).not.toBeInTheDocument();
  });

  it("renders skeleton rows inside the loading state — not a spinner", () => {
    mockUsePageState.mockReturnValue({ kind: "loading" });
    render(<TeamHomePage teamId={1} />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });
});

describe("TeamHomePage — denied state (BLD-X-FE-TEAMS-DETAIL-002)", () => {
  it("renders NoPermissionState when resolution is denied and not team content", () => {
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "build:teams:view" });
    render(<TeamHomePage teamId={1} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByText("Acme Squad")).not.toBeInTheDocument();
  });

  it("denied resolution does not render team content — denial must not look like an empty team", () => {
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "build:teams:view" });
    render(<TeamHomePage teamId={1} />);
    expect(screen.queryByTestId("team-projects-section")).not.toBeInTheDocument();
    expect(screen.queryByTestId("member-picker")).not.toBeInTheDocument();
  });
});

describe("TeamHomePage — error state (BLD-X-FE-TEAMS-DETAIL-003)", () => {
  it("renders error state when resolution is error", () => {
    mockUsePageState.mockReturnValue({ kind: "error", error: new Error("network failure") });
    render(<TeamHomePage teamId={1} />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });

  it("does not show team content when in error state", () => {
    mockUsePageState.mockReturnValue({ kind: "error", error: new Error("network failure") });
    render(<TeamHomePage teamId={1} />);
    expect(screen.queryByTestId("team-projects-section")).not.toBeInTheDocument();
  });
});

describe("TeamHomePage — empty state (BLD-X-FE-TEAMS-DETAIL-004)", () => {
  it("renders team-not-found empty state when data is absent and resolution is empty", () => {
    mockUsePageState.mockReturnValue({ kind: "empty" });
    mockTeamResult = { ...mockTeamResult, data: undefined };
    render(<TeamHomePage teamId={1} />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText("Team not found")).toBeInTheDocument();
  });
});

describe("TeamHomePage — ready state (BLD-X-FE-TEAMS-DETAIL-005)", () => {
  beforeEach(() => {
    mockTeamResult = { ...mockTeamResult, data: { ...BASE_TEAM } };
    mockMembersResult = {
      data: { data: [MEMBER_A, MEMBER_B], pagination: { limit: 25, hasMore: false, nextCursor: null } },
      isLoading: false,
    };
    mockUsePageState.mockReturnValue({ kind: "ready" });
  });

  it("renders team name as the page title when data is ready", () => {
    render(<TeamHomePage teamId={1} />);
    expect(screen.getByText("Acme Squad")).toBeInTheDocument();
  });

  it("renders team key in the header row", () => {
    render(<TeamHomePage teamId={1} />);
    expect(screen.getAllByText("AS").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the public badge for a non-private team", () => {
    render(<TeamHomePage teamId={1} />);
    expect(screen.getByText("Public")).toBeInTheDocument();
  });

  it("renders the private badge for a private team", () => {
    mockTeamResult = { ...mockTeamResult, data: { ...BASE_TEAM, isPrivate: true } };
    render(<TeamHomePage teamId={1} />);
    expect(screen.getByText("Private")).toBeInTheDocument();
  });

  it("renders member display names in the member list — email appears at least once per member", () => {
    render(<TeamHomePage teamId={1} />);
    expect(screen.getAllByText("alice@example.com").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("bob@example.com").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the team projects section", () => {
    render(<TeamHomePage teamId={1} />);
    expect(screen.getByTestId("team-projects-section")).toBeInTheDocument();
  });

  it("renders the member list with accessible role and aria-label via PmPanel", () => {
    render(<TeamHomePage teamId={1} />);
    expect(screen.getByRole("list", { name: /team members/i })).toBeInTheDocument();
  });
});

describe("TeamHomePage — permission-gated actions (BLD-X-FE-TEAMS-DETAIL-006)", () => {
  beforeEach(() => {
    mockTeamResult = { ...mockTeamResult, data: { ...BASE_TEAM } };
    mockMembersResult = {
      data: { data: [MEMBER_A], pagination: { limit: 25, hasMore: false, nextCursor: null } },
      isLoading: false,
    };
    mockUsePageState.mockReturnValue({ kind: "ready" });
  });

  it("hides the team actions dropdown when the viewer lacks build:teams:manage", () => {
    mockUseCan.mockReturnValue(false);
    render(<TeamHomePage teamId={1} />);
    expect(screen.queryByTestId("team-actions-trigger")).not.toBeInTheDocument();
  });

  it("shows the team actions dropdown when the viewer has build:teams:manage", () => {
    mockUseCan.mockReturnValue(true);
    render(<TeamHomePage teamId={1} />);
    expect(screen.getByTestId("team-actions-trigger")).toBeInTheDocument();
  });

  it("hides the MemberPicker (add member) when the viewer lacks build:teams:manage", () => {
    mockUseCan.mockReturnValue(false);
    render(<TeamHomePage teamId={1} />);
    expect(screen.queryByTestId("member-picker")).not.toBeInTheDocument();
  });

  it("shows the MemberPicker (add member) when the viewer has build:teams:manage", () => {
    mockUseCan.mockReturnValue(true);
    render(<TeamHomePage teamId={1} />);
    expect(screen.getByTestId("member-picker")).toBeInTheDocument();
  });

  it("shows role badge (not role select) for members when viewer lacks manage permission", () => {
    mockUseCan.mockReturnValue(false);
    render(<TeamHomePage teamId={1} />);
    expect(screen.getByText("lead")).toBeInTheDocument();
  });
});

describe("TeamHomePage — keyboard shortcuts (BLD-X-FE-TEAMS-DETAIL-007)", () => {
  beforeEach(() => {
    mockTeamResult = { ...mockTeamResult, data: { ...BASE_TEAM } };
    mockUsePageState.mockReturnValue({ kind: "ready" });
  });

  it("wires useBuildListKeyboard so keyboard shortcuts are active when not loading", () => {
    render(<TeamHomePage teamId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );
  });

  it("passes itemCount from members data to useBuildListKeyboard for j/k navigation bounds", () => {
    mockMembersResult = {
      data: { data: [MEMBER_A, MEMBER_B], pagination: { limit: 25, hasMore: false, nextCursor: null } },
      isLoading: false,
    };
    render(<TeamHomePage teamId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ itemCount: 2 }),
    );
  });

  it("passes searchInputRef to useBuildListKeyboard so / key can focus search", () => {
    render(<TeamHomePage teamId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ searchInputRef: expect.anything() }),
    );
  });

  it("disables keyboard shortcuts when isLoading is true — avoids nav on stale data", () => {
    mockUsePageState.mockReturnValue({ kind: "loading" });
    mockTeamResult = { ...mockTeamResult, isLoading: true };
    render(<TeamHomePage teamId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });
});

describe("TeamHomePage — pagination controls (BLD-X-FE-TEAMS-DETAIL-008)", () => {
  it("does not render previous/next controls when there is only one page", () => {
    mockTeamResult = { ...mockTeamResult, data: { ...BASE_TEAM } };
    mockMembersResult = {
      data: { data: [MEMBER_A], pagination: { limit: 25, hasMore: false, nextCursor: null } },
      isLoading: false,
    };
    mockUsePageState.mockReturnValue({ kind: "ready" });
    render(<TeamHomePage teamId={1} />);
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
    expect(screen.queryByText("Previous")).not.toBeInTheDocument();
  });

  it("renders the Next button when pagination has more results", () => {
    mockTeamResult = { ...mockTeamResult, data: { ...BASE_TEAM } };
    mockMembersResult = {
      data: { data: [MEMBER_A], pagination: { limit: 25, hasMore: true, nextCursor: "cursor123" } },
      isLoading: false,
    };
    mockUsePageState.mockReturnValue({ kind: "ready" });
    render(<TeamHomePage teamId={1} />);
    expect(screen.getByText("Next")).toBeInTheDocument();
  });
});

describe("TeamHomePage — empty member list (BLD-X-FE-TEAMS-DETAIL-009)", () => {
  it("renders the no-members empty state within the page when the team has no members", () => {
    mockTeamResult = { ...mockTeamResult, data: { ...BASE_TEAM } };
    mockMembersResult = {
      data: { data: [], pagination: { limit: 25, hasMore: false, nextCursor: null } },
      isLoading: false,
    };
    mockUsePageState.mockReturnValue({ kind: "ready" });
    render(<TeamHomePage teamId={1} />);
    expect(screen.getByText("No members yet")).toBeInTheDocument();
  });
});
