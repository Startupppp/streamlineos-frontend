import React from "react";
import { render, screen } from "@testing-library/react";
import { EmployeesDirectoryStats } from "./employees-directory-stats";

jest.mock("@/components/ui/stat-card", () => ({
  StatCard: ({ label, value, hint, href }: { label: string; value: number; hint?: string; href?: string }) => (
    <div data-testid={`stat-${label.toLowerCase()}`} data-href={href}>
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

const statusHref = (status: "active" | "inactive") => `/hr/employees?dept=eng&status=${status}`;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("EmployeesDirectoryStats — the summary is the filtered list's own count, never an org-wide headcount", () => {
  it("asks the counts endpoint for exactly the list's search, department and role filters", () => {
    mockUseHrEmployeeCounts.mockReturnValue({ isLoading: false, data: { active: 3, inactive: 1 } });

    render(
      <EmployeesDirectoryStats
        loadedCount={3}
        hasMore={false}
        statusFilter="active"
        filters={{ search: "ada", departmentId: "eng", role: undefined }}
        statusHref={statusHref}
      />,
    );

    expect(mockUseHrEmployeeCounts).toHaveBeenCalledWith({ search: "ada", departmentId: "eng", role: undefined });
  });

  it("Active filter: shows the filtered active count and how many of them are loaded", () => {
    mockUseHrEmployeeCounts.mockReturnValue({ isLoading: false, data: { active: 3, inactive: 1 } });

    render(
      <EmployeesDirectoryStats
        loadedCount={2}
        hasMore
        statusFilter="active"
        filters={{}}
        statusHref={statusHref}
      />,
    );

    expect(screen.getByTestId("stat-showing")).toHaveTextContent("Showing: 2 (of 3 matching)");
    expect(screen.getByTestId("stat-active")).toHaveTextContent("Active: 3 (Current filters)");
    expect(screen.queryByTestId("stat-inactive")).not.toBeInTheDocument();
    expect(screen.queryByText(/Org-wide/)).not.toBeInTheDocument();
  });

  it("All statuses: the loaded hint counts active + inactive and both status cards keep the other filters in their links", () => {
    mockUseHrEmployeeCounts.mockReturnValue({ isLoading: false, data: { active: 3, inactive: 2 } });

    render(
      <EmployeesDirectoryStats
        loadedCount={5}
        hasMore={false}
        statusFilter="all"
        filters={{ departmentId: "eng" }}
        statusHref={statusHref}
      />,
    );

    expect(screen.getByTestId("stat-showing")).toHaveTextContent("Showing: 5 (of 5 matching)");
    expect(screen.getByTestId("stat-active")).toHaveAttribute("data-href", "/hr/employees?dept=eng&status=active");
    expect(screen.getByTestId("stat-inactive")).toHaveAttribute("data-href", "/hr/employees?dept=eng&status=inactive");
  });

  it("empty Active set: reads zero, not a blank card", () => {
    mockUseHrEmployeeCounts.mockReturnValue({ isLoading: false, data: { active: 0, inactive: 0 } });

    render(
      <EmployeesDirectoryStats
        loadedCount={0}
        hasMore={false}
        statusFilter="active"
        filters={{ search: "nobody" }}
        statusHref={statusHref}
      />,
    );

    expect(screen.getByTestId("stat-showing")).toHaveTextContent("Showing: 0 (of 0 matching)");
    expect(screen.getByTestId("stat-active")).toHaveTextContent("Active: 0");
  });

  it("renders the skeleton while the counts load rather than a zero", () => {
    mockUseHrEmployeeCounts.mockReturnValue({ isLoading: true, data: undefined });

    render(
      <EmployeesDirectoryStats
        loadedCount={0}
        hasMore={false}
        statusFilter="all"
        filters={{}}
        statusHref={statusHref}
      />,
    );

    expect(screen.getByTestId("stats-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("stat-active")).not.toBeInTheDocument();
  });

  it("without counts (query disabled) shows only what is loaded and never invents a status count", () => {
    mockUseHrEmployeeCounts.mockReturnValue({ isLoading: false, data: undefined });

    render(
      <EmployeesDirectoryStats
        loadedCount={4}
        hasMore
        statusFilter="all"
        filters={{}}
        statusHref={statusHref}
      />,
    );

    expect(screen.getByTestId("stat-showing")).toHaveTextContent("Showing: 4 (More results available)");
    expect(screen.queryByTestId("stat-active")).not.toBeInTheDocument();
    expect(screen.queryByTestId("stat-inactive")).not.toBeInTheDocument();
  });
});
