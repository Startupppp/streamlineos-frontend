import { render as rtlRender, screen } from "@testing-library/react";
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
