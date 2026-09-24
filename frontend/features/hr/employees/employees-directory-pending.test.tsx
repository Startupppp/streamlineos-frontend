import React from "react";
import { render, screen } from "@testing-library/react";
import { EmployeesDirectoryStats } from "./employees-directory-stats";

/**
 * HRMS-E2E-014b. QA created one employee who never opened the invitation and the
 * directory reported two active. `users.isActive` is the ACCOUNT flag, set the
 * moment an administrator creates the person, so headcount counted an invitation
 * as a hire — and headcount is the number a founder reads off this screen.
 *
 * Pending is now its own card rather than a slice of Active.
 */
jest.mock("@/components/ui/stat-card", () => ({
  StatCard: ({ label, value, hint }: { label: string; value: number; hint?: string }) => (
    <div data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      {label}: {value} ({hint})
    </div>
  ),
  StatCardGrid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  StatCardGridSkeleton: () => <div data-testid="stats-skeleton" />,
}));

const mockUseHrEmployeeCounts = jest.fn();
jest.mock("@/hooks/api/hr/employee-list", () => ({
  useHrEmployeeCounts: (...args: unknown[]) => mockUseHrEmployeeCounts(...args),
}));

const statusHref = (status: "active" | "inactive") => `/hr/employees?status=${status}`;

function renderStats(
  data: { active: number; pending: number; inactive: number },
  statusFilter: "all" | "active" | "inactive" = "all",
) {
  mockUseHrEmployeeCounts.mockReturnValue({ isLoading: false, data });
  render(
    <EmployeesDirectoryStats
      loadedCount={data.active + data.pending + data.inactive}
      hasMore={false}
      statusFilter={statusFilter}
      filters={{}}
      statusHref={statusHref}
    />,
  );
}

beforeEach(() => jest.clearAllMocks());

describe("pending invites are not headcount", () => {
  it("keeps an invitee out of Active and shows them as pending", () => {
    renderStats({ active: 1, pending: 1, inactive: 0 });

    expect(screen.getByTestId("stat-active")).toHaveTextContent("Active: 1");
    expect(screen.getByTestId("stat-pending-invite")).toHaveTextContent("Pending invite: 1");
  });

  it("says what pending means, so the card is not read as a second kind of inactive", () => {
    renderStats({ active: 1, pending: 2, inactive: 0 });
    expect(screen.getByTestId("stat-pending-invite")).toHaveTextContent("Invited, not yet accepted");
  });

  it("hides the card when nobody is waiting", () => {
    renderStats({ active: 4, pending: 0, inactive: 1 });
    expect(screen.queryByTestId("stat-pending-invite")).not.toBeInTheDocument();
  });

  it("counts all three towards the total on screen", () => {
    renderStats({ active: 2, pending: 3, inactive: 1 });
    expect(screen.getByTestId("stat-showing")).toHaveTextContent("of 6 matching");
  });
});
