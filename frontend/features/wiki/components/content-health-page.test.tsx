import { render as rtlRender, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { bulkRepairHealthItemsInputSchema } from "@/hooks/api/kb/content-health-schema";

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
const useContentHealthTrend = jest.fn();
const mockUseAssignHealthItem = jest.fn();
const mockUseBulkRepairHealthItems = jest.fn();
const mockUseOrgMembersByIds = jest.fn();
const mockDismissMutateAsync = jest.fn();
const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams("signal=unowned");

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
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
  useContentHealthSignals: (...args: unknown[]) => useContentHealthSignals(...args),
  useDismissHealthItem: () => ({ mutateAsync: mockDismissMutateAsync, isPending: false }),
  useContentHealthTrend: () => useContentHealthTrend(),
  useAssignHealthItem: () => mockUseAssignHealthItem(),
  useContentHealthEvidence: () => ({ data: undefined, isLoading: false }),
  useBulkRepairHealthItems: () => mockUseBulkRepairHealthItems(),
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
import { ContentHealthDismissDialog } from "./content-health-dismiss-dialog";

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
  mockReplace.mockClear();
  mockSearchParams = new URLSearchParams("signal=unowned");
  mockDismissMutateAsync.mockResolvedValue({});
  useAccess.mockReturnValue(accessGranted);
  useContentHealthCounts.mockReturnValue({ ...IDLE, data: MIXED_COUNTS });
  useContentHealthSignals.mockReturnValue({ ...IDLE, data: SIGNAL_PAGE_WITH_ROWS });
  useContentHealthTrend.mockReturnValue({ data: { beforeCount: 6, afterCount: 8 }, isLoading: false });
  mockUseAssignHealthItem.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseBulkRepairHealthItems.mockReturnValue({ mutate: jest.fn(), isPending: false });
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

describe("ContentHealthDismissDialog snooze contract", () => {
  it("submits a timezone-qualified timestamp for a selected local snooze time", async () => {
    const user = userEvent.setup();
    render(
      <ContentHealthDismissDialog
        open
        onOpenChange={jest.fn()}
        pageId={42}
        pageTitle="Policy Draft"
        kind="stale"
      />,
    );

    await user.type(screen.getByRole("textbox", { name: "Reason" }), "Reviewed with owner");
    fireEvent.change(screen.getByLabelText(/Snooze until/), {
      target: { value: "2026-10-20T14:30" },
    });
    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    await waitFor(() => expect(mockDismissMutateAsync).toHaveBeenCalledWith({
      pageId: 42,
      kind: "stale",
      reason: "Reviewed with owner",
      dismissalExpiresAt: new Date("2026-10-20T14:30").toISOString(),
    }));
  });

  it("omits expiry for a permanent dismissal", async () => {
    const user = userEvent.setup();
    render(
      <ContentHealthDismissDialog
        open
        onOpenChange={jest.fn()}
        pageId={42}
        pageTitle="Policy Draft"
        kind="stale"
      />,
    );

    await user.type(screen.getByRole("textbox", { name: "Reason" }), "Accepted exception");
    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    await waitFor(() => expect(mockDismissMutateAsync).toHaveBeenCalledWith({
      pageId: 42,
      kind: "stale",
      reason: "Accepted exception",
      dismissalExpiresAt: undefined,
    }));
  });
});

describe("ContentHealthPage — populated state", () => {
  it("restores the cursor from the URL and keeps previous navigation in the same signal", async () => {
    useContentHealthSignals.mockReturnValue({
      ...IDLE,
      data: { ...SIGNAL_PAGE_WITH_ROWS, hasMore: true, nextCursor: 42 },
    });
    const view = render(<ContentHealthPage />);

    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    const nextUrl = new URL(mockReplace.mock.lastCall?.[0], "http://localhost");
    expect(nextUrl.searchParams.get("signal")).toBe("unowned");
    expect(nextUrl.searchParams.get("cursor")).toBe("42");
    expect(nextUrl.searchParams.get("cursorTrail")).toBe("~");

    mockSearchParams = nextUrl.searchParams;
    view.rerender(<TooltipProvider><ContentHealthPage /></TooltipProvider>);
    expect(useContentHealthSignals).toHaveBeenLastCalledWith({ signalType: "unowned", afterId: 42 });
    expect(screen.getByText("Page 2")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    const previousUrl = new URL(mockReplace.mock.lastCall?.[0], "http://localhost");
    expect(previousUrl.searchParams.get("cursor")).toBeNull();
    expect(previousUrl.searchParams.get("cursorTrail")).toBeNull();
  });

  it("clears the cursor and its trail with a signal filter change", async () => {
    mockSearchParams = new URLSearchParams("signal=unowned&cursor=42&cursorTrail=~");
    render(<ContentHealthPage />);

    await userEvent.click(screen.getByRole("button", { name: /Stale/i }));
    const filteredUrl = new URL(mockReplace.mock.lastCall?.[0], "http://localhost");
    expect(filteredUrl.searchParams.get("signal")).toBe("stale");
    expect(filteredUrl.searchParams.get("cursor")).toBeNull();
    expect(filteredUrl.searchParams.get("cursorTrail")).toBeNull();
  });

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

describe("ContentHealthPage — bulk repair dialog", () => {
  it("names and describes the dialog, then closes on Escape while preserving the selected page", async () => {
    const user = userEvent.setup();
    render(<ContentHealthPage />);

    await user.click(screen.getByRole("checkbox", { name: "Select Policy Draft" }));
    const trigger = screen.getByRole("button", { name: "Bulk repair (1)" });
    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Bulk repair — 1 page" });
    expect(dialog).toHaveAccessibleDescription(
      "Assign a person to resolve the selected issues.",
    );

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(screen.getByRole("checkbox", { name: "Select Policy Draft" })).toBeChecked();
  });

  it("requires a resolved owner and submits its membership ID for bulk assignment", async () => {
    const user = userEvent.setup();
    const mutate = jest.fn();
    mockUseBulkRepairHealthItems.mockReturnValue({ mutate, isPending: false });
    render(<ContentHealthPage />);

    await user.click(screen.getByRole("checkbox", { name: "Select Policy Draft" }));
    await user.click(screen.getByRole("button", { name: "Bulk repair (1)" }));

    const dialog = screen.getByRole("dialog", { name: "Bulk repair — 1 page" });
    const confirm = within(dialog).getByRole("button", { name: "Confirm" });
    expect(confirm).toBeDisabled();
    expect(within(dialog).queryByRole("button", { name: "Request review" })).not.toBeInTheDocument();

    await user.click(within(dialog).getByTestId("user-combobox"));
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    expect(mutate).toHaveBeenCalledWith(
      {
        pageIds: [42],
        kind: "unowned",
        repairAction: "assign_owner",
        assigneeMembershipId: 99,
      },
      expect.anything(),
    );
  });
});

describe("Content Health bulk assignment request contract", () => {
  const request = {
    pageIds: [42],
    kind: "unowned",
    repairAction: "assign_owner",
    assigneeMembershipId: 99,
  };

  it("accepts only a bounded assignment with a required membership ID", () => {
    expect(bulkRepairHealthItemsInputSchema.safeParse(request).success).toBe(true);
    expect(bulkRepairHealthItemsInputSchema.safeParse({ ...request, assigneeMembershipId: undefined }).success).toBe(false);
    expect(bulkRepairHealthItemsInputSchema.safeParse({ ...request, repairAction: "request_review" }).success).toBe(false);
    expect(bulkRepairHealthItemsInputSchema.safeParse({ ...request, repairAction: "mark_needs_content" }).success).toBe(false);
    expect(bulkRepairHealthItemsInputSchema.safeParse({ ...request, pageIds: [] }).success).toBe(false);
  });
});

describe("ContentHealthPage — trend labels", () => {
  it("describes the global open cohorts without implying a signal-specific before-and-after comparison", () => {
    render(<ContentHealthPage />);

    expect(screen.getByText("Open 30 days ago (all signals)")).toBeInTheDocument();
    expect(screen.getByText("Open now (all signals)")).toBeInTheDocument();
    expect(screen.getByText("+2 net change in visible open issues")).toBeInTheDocument();
    expect(screen.queryByText("Now (Unowned)")).not.toBeInTheDocument();
  });

  it("shows a decrease when fewer visible issues remain open than 30 days ago", () => {
    useContentHealthTrend.mockReturnValue({ data: { beforeCount: 8, afterCount: 6 }, isLoading: false });
    render(<ContentHealthPage />);

    expect(screen.getByText("-2 net change in visible open issues")).toBeInTheDocument();
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
    const refetchCounts = jest.fn();
    const refetchSignals = jest.fn();
    useContentHealthCounts.mockReturnValue({
      ...IDLE,
      isError: true,
      error: new Error("network"),
      data: undefined,
      refetch: refetchCounts,
    });
    useContentHealthSignals.mockReturnValue({ ...IDLE, data: SIGNAL_PAGE_WITH_ROWS, refetch: refetchSignals });
    render(<ContentHealthPage />);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetchCounts).toHaveBeenCalledTimes(1);
    expect(refetchSignals).toHaveBeenCalledTimes(1);
  });

  it("retries failed access before disabled Content Health reads", () => {
    const refetchAccess = jest.fn();
    const refetchCounts = jest.fn();
    const refetchSignals = jest.fn();
    useAccess.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Access service unavailable"),
      refetch: refetchAccess,
    });
    useContentHealthCounts.mockReturnValue({ ...IDLE, data: undefined, refetch: refetchCounts });
    useContentHealthSignals.mockReturnValue({ ...IDLE, data: undefined, refetch: refetchSignals });

    render(<ContentHealthPage />);

    expect(screen.getByText("Access service unavailable")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetchAccess).toHaveBeenCalledTimes(1);
    expect(refetchCounts).not.toHaveBeenCalled();
    expect(refetchSignals).not.toHaveBeenCalled();
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

describe("ContentHealthPage — the failing query is the one whose request id is quoted", () => {
  const { ApiError } = jest.requireActual("@/lib/api-envelope") as {
    ApiError: new (
      m: string,
      s?: number,
      c?: string,
      d?: unknown,
    ) => Error;
  };

  function failed(correlationId: string) {
    return {
      ...IDLE,
      data: undefined,
      isError: true,
      error: new ApiError("Upstream exploded", 500, "INTERNAL", {
        correlationId,
      }),
    };
  }

  it("renders the signal table when neither query failed, so the error assertions below are not vacuous", () => {
    render(<ContentHealthPage />);

    expect(screen.getByText("Policy Draft")).toBeInTheDocument();
  });

  it("quotes the counts request id when the counts query is the one that failed", () => {
    useContentHealthCounts.mockReturnValue(failed("req_counts_1"));

    render(<ContentHealthPage />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("req_counts_1")).toBeInTheDocument();
  });

  it("quotes the signals request id when the signals query is the one that failed, because the counts query holds no error to quote", () => {
    useContentHealthSignals.mockReturnValue(failed("req_signals_2"));

    render(<ContentHealthPage />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("req_signals_2")).toBeInTheDocument();
  });

  it("prefers the counts request id when both queries failed, so the reference is never ambiguous", () => {
    useContentHealthCounts.mockReturnValue(failed("req_counts_1"));
    useContentHealthSignals.mockReturnValue(failed("req_signals_2"));

    render(<ContentHealthPage />);

    expect(screen.getByText("req_counts_1")).toBeInTheDocument();
    expect(screen.queryByText("req_signals_2")).not.toBeInTheDocument();
  });
});
