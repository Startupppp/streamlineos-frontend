import { render, screen, fireEvent } from "@testing-library/react";
import { ProjectMilestonesPage } from "./project-milestones-page";
import { ApiError } from "@/lib/api-envelope";
import { toast } from "sonner";

let mockIsOnline = true;
const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/build/1/milestones",
  useSearchParams: () => mockSearchParams,
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (v: string) => v,
}));

jest.mock("@/hooks/api/build/milestones", () => ({
  useProjectMilestones: jest.fn(),
  useDeleteMilestone: jest.fn(),
  useUpdateMilestone: jest.fn(),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembersByIds: () => ({ data: { data: [{ membershipId: 4, userId: "user-4", name: "Dana Scully", email: "dana@example.com", image: null }] } }),
}));

jest.mock("@/hooks/api/build/build-members", () => ({
  useBuildMembers: () => ({
    data: {
      data: [{
        id: "user-4",
        role: "member",
        addedAt: "2026-01-01T00:00:00.000Z",
        name: "Dana Scully",
        firstName: "Dana",
        lastName: "Scully",
        email: "dana@example.com",
        image: null,
        teams: [],
      }],
    },
  }),
}));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: () => mockIsOnline,
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
    ul: ({ children, ...rest }: React.HTMLAttributes<HTMLUListElement>) => <ul {...rest}>{children}</ul>,
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: ({ ...props }: React.HTMLAttributes<HTMLElement>) => <span {...props} />,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title, actions, filters }: { children: React.ReactNode; title?: string; actions?: React.ReactNode; filters?: React.ReactNode }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {actions ? <div data-testid="page-actions">{actions}</div> : null}
      {filters ? <div data-testid="page-filters">{filters}</div> : null}
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

jest.mock("@/components/ui/stat-card", () => ({
  StatCard: ({ label, value }: { label: string; value: number }) => (
    <div data-testid={`stat-${label.toLowerCase()}`}>{value}</div>
  ),
  StatCardGrid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  StatCardGridSkeleton: () => <div data-testid="stat-grid-skeleton" />,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmStaggerList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CONTENT_FILL_PANEL: "pm-fill-panel",
  PM_TOOLBAR: "",
}));

jest.mock("@/components/ui/select", () => {
  const react = jest.requireActual<typeof import("react")>("react");
  const SelectChange = react.createContext<((value: string) => void) | undefined>(undefined);
  return {
    Select: ({ children, onValueChange }: { children: React.ReactNode; onValueChange?: (value: string) => void }) => (
      <SelectChange.Provider value={onValueChange}>{children}</SelectChange.Provider>
    ),
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => {
      const onValueChange = react.useContext(SelectChange);
      const handleClick = () => onValueChange?.(value);
      return (
        <button type="button" onClick={handleClick}>
          {children}
        </button>
      );
    },
    SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  };
});

jest.mock("./milestone-upsert-sheet", () => ({
  MilestoneUpsertSheet: () => <div data-testid="milestone-upsert-sheet" />,
}));

jest.mock("./milestone-card", () => ({
  MilestoneCard: ({ milestone, onSelect }: { milestone: { id: number; name: string }; onSelect?: (m: { id: number; name: string }, checked: boolean) => void }) => (
    <div data-testid="milestone-card" onClick={() => onSelect?.(milestone, true)}>{milestone.name}</div>
  ),
}));

import { useProjectMilestones, useDeleteMilestone, useUpdateMilestone } from "@/hooks/api/build/milestones";
import { useCan, useAccess } from "@/hooks/api/access";

const mockUseProjectMilestones = useProjectMilestones as jest.Mock;
const mockUseDeleteMilestone = useDeleteMilestone as jest.Mock;
const mockUseUpdateMilestone = useUpdateMilestone as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:view": "all" }, modules: {} },
  isLoading: false,
};
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};

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

function cursorPage<T>(items: T[]) {
  return { data: items, pagination: { limit: 20, hasMore: false, nextCursor: null } };
}

beforeEach(() => {
  mockIsOnline = true;
  mockReplace.mockClear();
  mockSearchParams = new URLSearchParams();
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseProjectMilestones.mockReturnValue(baseQueryResult({ data: cursorPage([]) }));
  mockUseDeleteMilestone.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseUpdateMilestone.mockReturnValue({ mutate: jest.fn(), isPending: false });
  (toast.success as jest.Mock).mockClear();
  (toast.error as jest.Mock).mockClear();
});

it("renders NoPermissionState when build:view is denied instead of empty milestone list", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseProjectMilestones.mockReturnValue(baseQueryResult());
  render(<ProjectMilestonesPage projectId="1" />);
  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("omits the all sentinel from the API date filters", () => {
  render(<ProjectMilestonesPage projectId="1" />);

  expect(mockUseProjectMilestones.mock.calls[0]?.[1]).toEqual(
    expect.objectContaining({ from: undefined, to: undefined }),
  );
});

it("renders milestone cards when data is populated", () => {
  const milestone = {
    id: 1,
    projectId: 1,
    orgId: "org-1",
    name: "Beta Launch",
    targetDate: "2026-12-01",
    status: "PENDING",
    description: null,
    createdBy: null,
    clientVisible: false,
    deletedAt: null,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  };
  mockUseProjectMilestones.mockReturnValue(
    baseQueryResult({ data: cursorPage([milestone]) }),
  );
  render(<ProjectMilestonesPage projectId="1" />);
  expect(screen.getByTestId("milestone-card")).toHaveTextContent("Beta Launch");
});

it("hides New Milestone button and delete actions when build:manage is denied", () => {
  mockUseCan.mockReturnValue(false);
  render(<ProjectMilestonesPage projectId="1" />);
  expect(screen.queryByRole("button", { name: /new milestone/i })).not.toBeInTheDocument();
});

it("shows New Milestone button when build:manage is granted", () => {
  mockUseCan.mockReturnValue(true);
  render(<ProjectMilestonesPage projectId="1" />);
  expect(screen.getByRole("button", { name: /new milestone/i })).toBeInTheDocument();
});

it("keyboard c shortcut opens create sheet when build:manage granted", () => {
  mockUseCan.mockReturnValue(true);
  render(<ProjectMilestonesPage projectId="1" />);
  fireEvent.keyDown(document, { key: "c" });
  expect(screen.getByTestId("milestone-upsert-sheet")).toBeInTheDocument();
});

const milestoneRow = {
  id: 1,
  projectId: 1,
  orgId: "org-1",
  name: "Beta Launch",
  targetDate: "2026-12-01",
  status: "PENDING" as const,
  description: null,
  createdBy: null,
  clientVisible: false,
  deletedAt: null,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

it("shows bulk action bar with count after milestone is selected", () => {
  mockUseProjectMilestones.mockReturnValue(
    baseQueryResult({ data: cursorPage([milestoneRow]) }),
  );
  render(<ProjectMilestonesPage projectId="1" />);
  expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByTestId("milestone-card"));
  expect(screen.getByText("1 selected")).toBeInTheDocument();
});

it("hides bulk action bar after clear button is clicked", () => {
  mockUseProjectMilestones.mockReturnValue(
    baseQueryResult({ data: cursorPage([milestoneRow]) }),
  );
  render(<ProjectMilestonesPage projectId="1" />);
  fireEvent.click(screen.getByTestId("milestone-card"));
  fireEvent.click(screen.getByLabelText("Clear selection"));
  expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
});

describe("ProjectMilestonesPage — the failure branch keeps the backend's status semantics", () => {
  it("offers the upgrade path the backend sent with a 402 rather than a generic load failure", () => {
    mockUseProjectMilestones.mockReturnValue(
      baseQueryResult({
        isError: true,
        error: new ApiError("Build is not included in your current plan.", 402, "MODULE_NOT_ENABLED", {
          moduleKey: "build",
          reason: "not-in-plan",
          upgradePath: "/settings/billing",
        }),
      }),
    );

    render(<ProjectMilestonesPage projectId="1" />);

    expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /plan|billing|upgrade/i })).toHaveAttribute(
      "href",
      "/settings/billing",
    );
  });

  it("still shows the backend message for an ordinary load failure, so the 402 branch did not swallow errors", () => {
    mockUseProjectMilestones.mockReturnValue(
      baseQueryResult({ isError: true, error: new Error("Milestones query timed out") }),
    );

    render(<ProjectMilestonesPage projectId="1" />);

    expect(screen.getByTestId("error-state").textContent).toContain("Milestones query timed out");
  });
});

describe("ProjectMilestonesPage — ownerId is a served query parameter, not a declared-and-ignored one", () => {
  it("forwards a numeric ownerId from the URL to the milestone list read", () => {
    mockSearchParams = new URLSearchParams("ownerId=4");
    render(<ProjectMilestonesPage projectId="1" />);
    expect(mockUseProjectMilestones).toHaveBeenCalledWith(1, expect.objectContaining({ ownerId: 4 }));
  });

  it("drops a non-numeric ownerId instead of sending NaN, which the backend schema would reject", () => {
    mockSearchParams = new URLSearchParams("ownerId=user-7");
    render(<ProjectMilestonesPage projectId="1" />);
    expect(mockUseProjectMilestones).toHaveBeenCalledWith(1, expect.objectContaining({ ownerId: undefined }));
  });

  it("offers the owner filter by member display name so the control never shows a membership id", () => {
    render(<ProjectMilestonesPage projectId="1" />);
    expect(screen.getByTestId("page-filters")).toHaveTextContent("Dana Scully");
    expect(screen.getByTestId("page-filters")).not.toHaveTextContent("Any owner4");
  });

  it("writes the picked owner into the URL rather than filtering the loaded page in memory", () => {
    render(<ProjectMilestonesPage projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: "Dana Scully" }));
    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining("ownerId=4"), { scroll: false });
  });
});

describe("ProjectMilestonesPage — offline state", () => {
  it("shows the offline notice when connectivity is lost", () => {
    mockIsOnline = false;
    render(<ProjectMilestonesPage projectId="1" />);
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
  });

  it("shows no offline notice while online, so the notice is driven by connectivity and not always rendered", () => {
    render(<ProjectMilestonesPage projectId="1" />);
    expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument();
  });
});

describe("ProjectMilestonesPage — a bulk status change reports a per-record result", () => {
  const rowA = { ...milestoneRow, id: 1, name: "Beta Launch", version: 3 };
  const rowB = { ...milestoneRow, id: 2, name: "GA Launch", version: 5 };

  function bulkSetAchieved() {
    fireEvent.click(screen.getAllByTestId("milestone-card")[0]);
    fireEvent.click(screen.getAllByTestId("milestone-card")[1]);
    const achieved = screen.getAllByRole("button", { name: "Achieved" });
    fireEvent.click(achieved[achieved.length - 1]);
  }

  it("reports both rows updated when every mutation succeeds", () => {
    const mutate = jest.fn((_vars, opts) => opts.onSuccess?.());
    mockUseUpdateMilestone.mockReturnValue({ mutate, isPending: false });
    mockUseProjectMilestones.mockReturnValue(baseQueryResult({ data: cursorPage([rowA, rowB]) }));
    render(<ProjectMilestonesPage projectId="1" />);
    bulkSetAchieved();
    expect(mutate).toHaveBeenCalledTimes(2);
    expect(toast.success).toHaveBeenCalledWith("2 milestones updated");
  });

  it("names the failed row and the survivors when one of two mutations is rejected", () => {
    const mutate = jest.fn((vars: { milestoneId: number }, opts) => {
      if (vars.milestoneId === 2) opts.onError?.(new Error("stale token"));
      else opts.onSuccess?.();
    });
    mockUseUpdateMilestone.mockReturnValue({ mutate, isPending: false });
    mockUseProjectMilestones.mockReturnValue(baseQueryResult({ data: cursorPage([rowA, rowB]) }));
    render(<ProjectMilestonesPage projectId="1" />);
    bulkSetAchieved();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("1 of 2 milestones updated"));
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("GA Launch"));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("sends each selected row's own version token, so no row is saved with another row's token", () => {
    const mutate = jest.fn((_vars, opts) => opts.onSuccess?.());
    mockUseUpdateMilestone.mockReturnValue({ mutate, isPending: false });
    mockUseProjectMilestones.mockReturnValue(baseQueryResult({ data: cursorPage([rowA, rowB]) }));
    render(<ProjectMilestonesPage projectId="1" />);
    bulkSetAchieved();
    expect(mutate).toHaveBeenCalledWith({ milestoneId: 1, version: 3, status: "ACHIEVED" }, expect.anything());
    expect(mutate).toHaveBeenCalledWith({ milestoneId: 2, version: 5, status: "ACHIEVED" }, expect.anything());
  });
});
