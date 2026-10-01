import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { apiClient } from "@/lib/api-client";
import type { TimesheetEntry } from "@/features/timesheets/types";
import { WeekGrid, describeCopyResult } from "./week-grid";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useScope: jest.fn(() => "all"),
  useModuleEnabled: jest.fn(() => true),
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {} }, refetch: jest.fn() })),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  newIdempotencyKey: () => "test-key",
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const get = apiClient.get as jest.Mock;
const post = apiClient.post as jest.Mock;

const DAYS = [
  "2026-09-07",
  "2026-09-08",
  "2026-09-09",
  "2026-09-10",
  "2026-09-11",
  "2026-09-12",
  "2026-09-13",
];

function entry(over: Partial<TimesheetEntry>): TimesheetEntry {
  return {
    id: 1,
    orgId: "org_1",
    userMembershipId: 201,
    ticketId: null,
    projectId: 10,
    timesheetPeriodId: 1,
    date: "2026-08-31",
    hours: "4",
    description: null,
    isBillable: true,
    billingType: "BILLABLE",
    status: "PENDING",
    submittedAt: null,
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
    lockedAt: null,
    voidedAt: null,
    invoicingStatus: "UNINVOICED",
    billRate: null,
    currency: null,
    rateSource: null,
    source: "MANUAL",
    workLink: null,
    createdAt: "2026-08-31T00:00:00.000Z",
    updatedAt: "2026-08-31T00:00:00.000Z",
    project: { id: 10, name: "Apollo redesign" },
    ticket: null,
    ...over,
  };
}

function renderGrid() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>{children}</TooltipProvider>
      </QueryClientProvider>
    );
  }
  return render(
    <WeekGrid
      entries={[]}
      isLoading={false}
      days={DAYS}
      weekStart={DAYS[0] as string}
      weekEnd={DAYS[6] as string}
    />,
    { wrapper: Wrapper },
  );
}

const LAST_WEEK = [
  entry({ id: 1, date: "2026-08-31", hours: "4" }),
  entry({ id: 2, date: "2026-09-01", hours: "6" }),
];

beforeEach(() => {
  jest.clearAllMocks();
  get.mockImplementation((url: string) => {
    if (url === "/timesheets/calendar/holidays")
      return Promise.resolve({ startDate: DAYS[0], endDate: DAYS[6], holidays: [] });
    if (url === "/timesheets/entries")
      return Promise.resolve({ data: LAST_WEEK, pagination: { hasMore: false } });
    return Promise.resolve([]);
  });
});

describe("FE-TS-006 — copying last week waits for the creates it started", () => {
  it("stays busy until every create has settled, then reports once", async () => {
    const user = userEvent.setup();
    const settle: Array<() => void> = [];
    post.mockImplementation(
      () =>
        new Promise((resolve) => {
          settle.push(() => resolve(entry({ id: 99 })));
        }),
    );

    renderGrid();
    await user.click(screen.getByRole("button", { name: /copy last week/i }));

    // One create in flight; the button must not have gone idle already.
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: /copying/i })).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();

    settle[0]?.();
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", { name: /copying/i })).toBeInTheDocument();

    settle[1]?.();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /copy last week/i })).toBeInTheDocument(),
    );
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Copied 2 entries.");
  });

  it("reports a partial copy as a failure rather than a silent one", async () => {
    const user = userEvent.setup();
    post
      .mockResolvedValueOnce(entry({ id: 99 }))
      .mockRejectedValueOnce(new Error("conflict"));

    renderGrid();
    await user.click(screen.getByRole("button", { name: /copy last week/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(toast.error).toHaveBeenCalledWith("Copied 1 entry · 1 failed.");
  });
});

describe("what a copy result says", () => {
  it("does not claim a copy when every row was already logged", () => {
    expect(describeCopyResult({ created: 0, skipped: 3, failed: 0 })).toMatch(
      /already has those entries/i,
    );
  });

  it("distinguishes an empty previous week from one already copied", () => {
    expect(describeCopyResult({ created: 0, skipped: 0, failed: 0 })).toMatch(
      /no entries to copy/i,
    );
  });
});
