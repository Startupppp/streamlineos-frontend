import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { TeamAttendanceEntry } from "@/types/hr";

/**
 * V-061. Two things this card promises and nothing proved: a person with no
 * clock data reads "Not checked in", never "Offline"; and an org with no
 * attendance data at all is offered a route into setup rather than a dead end.
 */
let canManage = true;
// The page now resolves its state through usePageState, which reads session,
// access and entitlements; resolve it as granted so the test exercises the
// page, not the provider tree.
jest.mock("@/hooks/api/use-page-state", () => {
  const { resolvePageState } = jest.requireActual<typeof import("@/lib/page-state/resolve-page-state")>(
    "@/lib/page-state/resolve-page-state",
  );
  return {
    usePageState: (options: Omit<Parameters<typeof resolvePageState>[0], "access">) =>
      resolvePageState({ ...options, access: "granted" }),
  };
});

jest.mock("@/hooks/api/access", () => ({
  useCan: () => canManage,
  useModuleEnabled: () => true,
  useAccess: () => ({ data: { isOrgOwner: false, scopes: {} }, isLoading: false }),
}));

const teamStatus = jest.fn();
jest.mock("@/hooks/api/hr", () => ({
  useHrTeamAttendanceStatus: (...args: unknown[]) => teamStatus(...args),
  useHrDepartments: () => ({
    data: [
      { id: 7, name: "Engineering" },
      { id: 8, name: "Support" },
    ],
  }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/hr/attendance",
}));

import { TeamAttendanceCard } from "@/features/hr/attendance/team-attendance-card";

function entry(overrides: Partial<TeamAttendanceEntry> = {}): TeamAttendanceEntry {
  return {
    userId: "usr-1",
    name: "QA Person",
    image: null,
    department: "Engineering",
    status: "OFFLINE",
    checkIn: null,
    checkOut: null,
    workHours: null,
    ...overrides,
  } as TeamAttendanceEntry;
}

function withEntries(entries: TeamAttendanceEntry[]) {
  teamStatus.mockReturnValue({
    data: {
      data: entries,
      counts: { PRESENT: 0, ON_BREAK: 0, CHECKED_OUT: 0, OFFLINE: entries.length },
      pagination: { total: entries.length, hasMore: false, nextCursor: null },
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  });
}

beforeEach(() => {
  canManage = true;
  teamStatus.mockReset();
});

describe("TeamAttendanceCard", () => {
  it("labels a person with no clock data 'Not checked in', never 'Offline'", () => {
    withEntries([entry()]);
    render(<TeamAttendanceCard />);

    expect(screen.getAllByText("Not checked in").length).toBeGreaterThan(0);
    expect(screen.queryByText(/^Offline$/i)).not.toBeInTheDocument();
  });

  it("offers a setup link when the team has no attendance data and no filters are active", () => {
    withEntries([]);
    render(<TeamAttendanceCard />);

    expect(
      screen.getByRole("link", { name: "Set up shifts and rosters" }),
    ).toHaveAttribute("href", "/hr/rosters");
  });

  it("does not offer the setup link to someone who cannot manage attendance", () => {
    // The paired negative for FE-55: a link that would end at Access Denied.
    canManage = false;
    withEntries([]);
    render(<TeamAttendanceCard />);

    expect(
      screen.queryByRole("link", { name: "Set up shifts and rosters" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the department filter working when the list is empty", async () => {
    withEntries([]);
    render(<TeamAttendanceCard />);

    fireEvent.change(screen.getByPlaceholderText(/Search name or email/i), {
      target: { value: "nobody" },
    });

    // A filtered emptiness offers Clear filters, not the setup route.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Clear filters/i })).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("link", { name: "Set up shifts and rosters" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Clear filters/i }));

    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: "Set up shifts and rosters" }),
      ).toBeInTheDocument(),
    );
  });
});
