import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { apiClient } from "@/lib/api-client";
import type { TimesheetEntry } from "@/features/timesheets/types";
import { WeekGrid } from "./week-grid";

/**
 * jsdom paints nothing, so this cannot prove what a phone shows (FE-123). What
 * it does pin is the half that was wrong: the scroll affordance was hidden at
 * `sm` and up while the grid still overflowed there — exactly the 768px case —
 * and every day plus the total has to be in the scrollable region.
 */

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

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const get = apiClient.get as jest.Mock;

const DAYS = [
  "2026-09-07",
  "2026-09-08",
  "2026-09-09",
  "2026-09-10",
  "2026-09-11",
  "2026-09-12",
  "2026-09-13",
];

const DAY_NAMES = [
  "Monday 7 September",
  "Tuesday 8 September",
  "Wednesday 9 September",
  "Thursday 10 September",
  "Friday 11 September",
  "Saturday 12 September",
  "Sunday 13 September",
];

function entry(over: Partial<TimesheetEntry>): TimesheetEntry {
  return {
    id: 1,
    orgId: "org_1",
    userMembershipId: 201,
    ticketId: null,
    projectId: 10,
    timesheetPeriodId: 1,
    date: "2026-09-07",
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
    createdAt: "2026-09-07T00:00:00.000Z",
    updatedAt: "2026-09-07T00:00:00.000Z",
    project: { id: 10, name: "Apollo redesign" },
    ticket: null,
    ...over,
  };
}

/** Stands in for layout: the table is 800px wide inside a viewport-width box. */
function withViewportWidth(width: number) {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get() {
      return width;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
    configurable: true,
    get() {
      return 800;
    },
  });
}

function renderGrid() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
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
      entries={[entry({ id: 1 })]}
      isLoading={false}
      days={DAYS}
      weekStart={DAYS[0] as string}
      weekEnd={DAYS[6] as string}
    />,
    { wrapper: Wrapper },
  );
}

afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
  Reflect.deleteProperty(HTMLElement.prototype, "scrollWidth");
});

beforeEach(() => {
  jest.clearAllMocks();
  get.mockResolvedValue({ startDate: DAYS[0], endDate: DAYS[6], holidays: [] });
});

describe("TS-001 / TS-002 — every day of the week stays reachable when the grid overflows", () => {
  it.each([
    ["390px, a phone", 390],
    ["768px, a tablet with the sidebar open", 768],
  ])("offers a scroll affordance at %s", async (_name, width) => {
    withViewportWidth(width);
    renderGrid();

    const hint = await screen.findByText(/scroll sideways/i);
    // The 768 case is the regression: this line used to carry `sm:hidden`.
    expect(hint.className).not.toMatch(/(^|[\s:])sm:hidden/);
    expect(hint).toBeVisible();
  });

  it("keeps all seven days and the weekly total inside the scrollable region", () => {
    withViewportWidth(390);
    renderGrid();

    for (const name of DAY_NAMES)
      expect(screen.getByRole("columnheader", { name })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Total" })).toBeInTheDocument();

    const scroller = screen.getByRole("table").parentElement;
    expect(scroller?.className).toMatch(/overflow-x-auto/);
  });

  it("says nothing about scrolling when the grid fits", async () => {
    withViewportWidth(1280);
    renderGrid();

    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(screen.queryByText(/scroll sideways/i)).not.toBeInTheDocument();
  });
});
