import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import type { TimesheetEntry } from "@/features/timesheets/types";
import { WeekGrid } from "./week-grid";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useScope: jest.fn(() => "all"),
  useModuleEnabled: jest.fn(() => true),
  useAccess: jest.fn(() => ({
    data: { scopes: {}, modules: {}, isOrgOwner: false },
    refetch: jest.fn(),
  })),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  newIdempotencyKey: () => "test-key",
}));

const get = apiClient.get as jest.Mock;
const can = useCan as jest.Mock;

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

function renderGrid(entries: TimesheetEntry[]) {
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
      entries={entries}
      isLoading={false}
      days={DAYS}
      weekStart={DAYS[0] as string}
      weekEnd={DAYS[6] as string}
    />,
    { wrapper: Wrapper },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  can.mockReturnValue(true);
  get.mockImplementation((url: string) => {
    if (url === "/timesheets/calendar/holidays") {
      return Promise.resolve({
        startDate: DAYS[0],
        endDate: DAYS[6],
        holidays: [{ date: "2026-09-09", name: "Onam", isPublic: true }],
      });
    }
    return Promise.resolve([]);
  });
});

describe("week grid accessibility", () => {
  it("gives every hours cell a name that says which project and which day", async () => {
    renderGrid([entry({ id: 1, date: "2026-09-07", hours: "4" })]);

    expect(
      screen.getByRole("spinbutton", {
        name: "Apollo redesign, Monday 7 September, hours",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("spinbutton", {
        name: "Apollo redesign, Friday 11 September, hours",
      }),
    ).toBeInTheDocument();
  });

  it("announces a holiday in the cell name, not only as a background tint", async () => {
    renderGrid([entry({ id: 1, date: "2026-09-07" })]);

    await waitFor(() =>
      expect(
        screen.getByRole("spinbutton", {
          name: "Apollo redesign, Wednesday 9 September, company holiday: Onam, hours",
        }),
      ).toBeInTheDocument(),
    );
  });

  it("keeps a locked cell reachable and says it is locked", () => {
    renderGrid([
      entry({ id: 1, date: "2026-09-07", hours: "4", lockedAt: "2026-09-14T00:00:00.000Z" }),
    ]);

    const locked = screen.getByRole("spinbutton", {
      name: "Apollo redesign, Monday 7 September, hours, locked",
    });
    expect(locked).toHaveAttribute("readonly");
    expect(locked).not.toBeDisabled();
  });

  it("moves between cells with the arrow keys instead of stepping the number", async () => {
    const user = userEvent.setup();
    renderGrid([entry({ id: 1, date: "2026-09-07", hours: "4" })]);

    const monday = screen.getByRole("spinbutton", {
      name: "Apollo redesign, Monday 7 September, hours",
    });
    const tuesday = screen.getByRole("spinbutton", {
      name: "Apollo redesign, Tuesday 8 September, hours",
    });

    monday.focus();
    await user.keyboard("{ArrowRight}");
    expect(tuesday).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(monday).toHaveFocus();

    await user.keyboard("{End}");
    expect(
      screen.getByRole("spinbutton", {
        name: "Apollo redesign, Sunday 13 September, hours",
      }),
    ).toHaveFocus();

    await user.keyboard("{Home}");
    expect(monday).toHaveFocus();
    expect(monday).toHaveValue(4);
  });

  it("names the grid and its row and column headers", () => {
    renderGrid([entry({ id: 1, date: "2026-09-07" })]);

    expect(
      screen.getByRole("columnheader", { name: "Wednesday 9 September" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("rowheader", { name: /Apollo redesign/ }),
    ).toBeInTheDocument();
  });

  it("carries a live region for the silent background saves", () => {
    const { container } = renderGrid([entry({ id: 1, date: "2026-09-07" })]);

    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
  });
});
