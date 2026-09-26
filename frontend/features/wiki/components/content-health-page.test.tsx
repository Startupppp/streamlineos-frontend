import { render as rtlRender, screen, fireEvent } from "@testing-library/react";
import type { ReactElement } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

const useAccess = jest.fn();
const accessLoading = { data: undefined, isLoading: true };
const accessGranted = {
  data: {
    isOrgOwner: false,
    scopes: { "kb:pages:manage": "all" },
    modules: {},
  },
  isLoading: false,
};
const accessDenied = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};

const useContentHealthCounts = jest.fn();
const useContentHealthSignals = jest.fn();
const mockUseAssignHealthItem = jest.fn();
const mockUseOrgMembersByIds = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams("signal=unowned"),
  usePathname: () => "/knowledge/wiki/manage",
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => useAccess(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/kb/content-health", () => ({
  useContentHealthCounts: () => useContentHealthCounts(),
  useContentHealthSignals: () => useContentHealthSignals(),
  useDismissHealthItem: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useContentHealthTrend: () => ({ data: { beforeCount: 10, afterCount: 8 }, isLoading: false }),
  useAssignHealthItem: () => mockUseAssignHealthItem(),
  useContentHealthEvidence: () => ({ data: undefined, isLoading: false }),
  useBulkRepairHealthItems: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembersByIds: (...args: unknown[]) => mockUseOrgMembersByIds(...args),
}));

jest.mock("@/components/ui/user-combobox", () => ({
  UserCombobox: ({ value, onChange }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) => (
    <button
      data-testid="user-combobox"
      type="button"
      onClick={() => onChange("user-abc")}
    >
      {value ? value : "Select member…"}
    </button>
  ),
}));

jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode; open?: boolean; onOpenChange?: (o: boolean) => void }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode; className?: string; align?: string }) => <div>{children}</div>,
}));

import ContentHealthPage from "./content-health-page";

function render(ui: ReactElement) {
  return rtlRender(<TooltipProvider>{ui}</TooltipProvider>);
}

const ALL_ZERO_COUNTS = {
  counts: [
    { signalType: "unowned", count: 0 },
    { signalType: "stale", count: 0 },
    { signalType: "unverified", count: 0 },
    { signalType: "empty", count: 0 },
    { signalType: "overdue_review", count: 0 },
    { signalType: "broken_link", count: 0 },
    { signalType: "overexposed", count: 0 },
    { signalType: "duplicate_candidate", count: 0 },
  ],
};

const MIXED_COUNTS = {
  counts: [
    { signalType: "unowned", count: 3 },
    { signalType: "stale", count: 1 },
    { signalType: "unverified", count: 0 },
    { signalType: "empty", count: 0 },
    { signalType: "overdue_review", count: 0 },
    { signalType: "broken_link", count: 0 },
    { signalType: "overexposed", count: 2 },
    { signalType: "duplicate_candidate", count: 1 },
  ],
};

const SIGNAL_PAGE_WITH_ROWS = {
  data: [
    {
      id: 42,
      title: "Policy Draft",
      spaceId: 1,
      status: "draft",
      ownerMembershipId: null,
      updatedAt: "2025-01-01T00:00:00.000Z",
      nextReviewAt: null,
      impact: 60,
    },
  ],
  hasMore: false,
  nextCursor: null,
};

const SIGNAL_PAGE_EMPTY = { data: [], hasMore: false, nextCursor: null };

const IDLE = {
  isLoading: false,
  isError: false,
  error: undefined,
  refetch: jest.fn(),
};

beforeEach(() => {
  useAccess.mockReturnValue(accessGranted);
  useContentHealthCounts.mockReturnValue({ ...IDLE, data: MIXED_COUNTS });
  useContentHealthSignals.mockReturnValue({ ...IDLE, data: SIGNAL_PAGE_WITH_ROWS });
  mockUseAssignHealthItem.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseOrgMembersByIds.mockReturnValue({
    data: {
      data: [
        {
          userId: "user-abc",
          membershipId: 99,
          name: "Alice Smith",
          email: "alice@example.com",
          image: null,
          role: "member",
          totpEnabled: false,
          joinedAt: "2024-01-01",
        },
      ],
      pagination: { hasMore: false, nextCursor: null },
    },
    isLoading: false,
  });
});

afterEach(() => jest.resetAllMocks());

describe("ContentHealthPage — populated state", () => {
  it("renders count chips for all eight signals including overexposed and duplicate_candidate", () => {
    render(<ContentHealthPage />);
    expect(screen.getAllByText("Overexposed").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Duplicate candidate").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Unowned").length).toBeGreaterThanOrEqual(1);
  });

  it("displays the count value from the counts response on each chip", () => {
    render(<ContentHealthPage />);
    const buttons = screen.getAllByRole("button");
    const overexposedChip = buttons.find((el) =>
      el.textContent?.includes("Overexposed"),
    );
    expect(overexposedChip?.textContent).toContain("2");
  });

  it("renders a row for each signal item with a link to the canonical page", () => {
    render(<ContentHealthPage />);
    expect(screen.getByText("Policy Draft")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Policy Draft" });
    expect(link).toHaveAttribute("href", expect.stringContaining("42"));
  });

  it("links to the knowledge-gaps surface for unanswered-search discoverability", () => {
    render(<ContentHealthPage />);
    const gapLink = screen.getByRole("link", { name: /knowledge gaps/i });
    expect(gapLink).toHaveAttribute("href", "/support/knowledge-gaps");
  });

  it("renders the impact score for each row so curators can see relative severity", () => {
    render(<ContentHealthPage />);
    expect(screen.getByText("60")).toBeInTheDocument();
  });

  it("renders a Dismiss button for each signal row so curators can suppress known non-issues, and also renders a positive control link so the test cannot pass on a blank render", () => {
    render(<ContentHealthPage />);
    expect(screen.getByRole("button", { name: /dismiss/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Policy Draft" })).toBeInTheDocument();
  });
});

describe("ContentHealthPage — first-empty state", () => {
  it("renders the all-clear message when every signal count is zero", () => {
    useContentHealthCounts.mockReturnValue({ ...IDLE, data: ALL_ZERO_COUNTS });
    render(<ContentHealthPage />);
    expect(
      screen.getByText(/No content health issues/i),
    ).toBeInTheDocument();
  });
});

describe("ContentHealthPage — filtered-empty state", () => {
  it("renders the per-signal empty message when the active signal list is empty", () => {
    useContentHealthSignals.mockReturnValue({ ...IDLE, data: SIGNAL_PAGE_EMPTY });
    render(<ContentHealthPage />);
    expect(screen.getByText(/No unowned pages/i)).toBeInTheDocument();
  });
});

describe("ContentHealthPage — loading state", () => {
  it("renders skeletons rather than content while access and data are still loading", () => {
    useAccess.mockReturnValue(accessLoading);
    useContentHealthCounts.mockReturnValue({ ...IDLE, isLoading: true, data: undefined });
    useContentHealthSignals.mockReturnValue({ ...IDLE, isLoading: true, data: undefined });
    render(<ContentHealthPage />);
    expect(screen.queryByText("Policy Draft")).not.toBeInTheDocument();
  });
});

describe("ContentHealthPage — denied state", () => {
  it("does not render signal chips or page rows when the user lacks kb:pages:manage", () => {
    useAccess.mockReturnValue(accessDenied);
    render(<ContentHealthPage />);
    expect(screen.queryByText("Overexposed")).not.toBeInTheDocument();
    expect(screen.queryByText("Policy Draft")).not.toBeInTheDocument();
  });
});

describe("ContentHealthPage — error state", () => {
  it("renders a retry control when the counts query errors so the user is not stuck", () => {
    useContentHealthCounts.mockReturnValue({
      ...IDLE,
      isError: true,
      error: new Error("network"),
      data: undefined,
    });
    render(<ContentHealthPage />);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });
});

describe("ContentHealthPage — assign by name, not by raw ID", () => {
  it("selecting a member by name passes the resolved membership ID to the assign mutation, not a typed numeric ID", () => {
    const assignMutate = jest.fn();
    mockUseAssignHealthItem.mockReturnValue({ mutate: assignMutate, isPending: false });

    render(<ContentHealthPage />);

    fireEvent.click(screen.getByTestId("user-combobox"));

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(assignMutate).toHaveBeenCalledWith(
      expect.objectContaining({ assigneeMembershipId: 99 }),
      expect.anything(),
    );
  });
});
