import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EmployeeListItem } from "@/types/hr";
import { EmployeesListPage } from "./employees-list-page";

const replace = jest.fn();
let urlSearch = "";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: jest.fn() }),
  usePathname: () => "/hr/employees",
  useSearchParams: () => new URLSearchParams(urlSearch),
}));

jest.mock("@/hooks/api/use-page-state", () => ({ usePageState: () => ({ kind: "ready" }) }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => false, useCanState: () => "denied" }));
jest.mock("@/hooks/api/hr/employee-list", () => ({ useHrEmployeeCounts: () => ({ data: undefined, isLoading: false }) }));
jest.mock("@/features/hr/employees/employees-directory-stats", () => ({
  EmployeesDirectoryStats: ({ loadedCount }: { loadedCount: number }) => (
    <div data-testid="stats">showing {loadedCount}</div>
  ),
}));
jest.mock("@/hooks/api/hr/employee-profile", () => ({
  useEmployeeEmployment: () => ({ data: undefined, isLoading: false, isFetching: false }),
}));

function employee(id: string, first: string, last: string, email: string): EmployeeListItem {
  return {
    id,
    name: `${first} ${last}`,
    firstName: first,
    lastName: last,
    email,
    role: "MEMBER",
    designation: "Engineer",
    employeeId: `E-${id}`,
    image: null,
    isActive: true,
    hasAccepted: true,
    joiningDate: null,
    reportingTo: null,
    department: null,
  };
}

const ROSTER = [
  employee("1", "Tarun", "Chintakunta", "tarun@example.test"),
  employee("2", "Ada", "Lovelace", "ada@example.test"),
];

const serverRows = jest.fn<EmployeeListItem[], [string | undefined]>();
const searchesSeen: Array<string | undefined> = [];

jest.mock("@/hooks/api/hr", () => ({
  useHrDepartments: () => ({ data: [] }),
  useInfiniteHrEmployees: (params: { search?: string } | undefined) => {
    searchesSeen.push(params?.search);
    return {
      data: { pages: [{ data: serverRows(params?.search) }] },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
      refetch: jest.fn(),
    };
  },
}));

beforeEach(() => {
  jest.useFakeTimers();
  urlSearch = "";
  replace.mockReset();
  searchesSeen.length = 0;
  serverRows.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

async function type(value: string) {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.type(screen.getByRole("searchbox"), value);
  act(() => {
    jest.advanceTimersByTime(400);
  });
}

describe("Flow 12 — a visible employee must be findable, and an empty search is a valid state", () => {
  it("keeps the matching row on screen for an exact display name, and sends the query to the server", async () => {
    serverRows.mockImplementation((search) =>
      search ? ROSTER.filter((row) => row.name === search) : ROSTER,
    );
    render(<EmployeesListPage />);

    await type("Tarun Chintakunta");

    expect(searchesSeen).toContain("Tarun Chintakunta");
    expect(replace).toHaveBeenCalled();
  });

  it("shows zero rows and the filtered empty state for a typed no-match right after a match, with no banner and no unfiltered rows", async () => {
    serverRows.mockImplementation((search) => (search ? [] : ROSTER));
    render(<EmployeesListPage />);

    expect(screen.getByText("Tarun Chintakunta")).toBeInTheDocument();

    await type("zzzz");

    expect(screen.getByText("No results match your filters.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/integrity/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Tarun Chintakunta")).not.toBeInTheDocument();
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    expect(searchesSeen.filter((search) => search === undefined).length).toBeGreaterThan(0);
    expect(searchesSeen).toContain("zzzz");
  });

  it("draws a plain empty state, not an integrity error, for an organization with no people", async () => {
    serverRows.mockReturnValue([]);
    render(<EmployeesListPage />);

    expect(screen.getByText("No people yet")).toBeInTheDocument();

    await type("anyone");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("No results match your filters.")).toBeInTheDocument();
  });

  it("restores the scoped list when the query is cleared", async () => {
    serverRows.mockImplementation((search) =>
      search ? ROSTER.filter((row) => row.firstName === search) : ROSTER,
    );
    render(<EmployeesListPage />);

    await type("Ada");
    expect(screen.queryByText("Tarun Chintakunta")).not.toBeInTheDocument();

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.clear(screen.getByRole("searchbox"));
    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(screen.getByText("Tarun Chintakunta")).toBeInTheDocument();
  });

  it("marks the search box busy while the typed query is still pending (round-2 UX #3)", async () => {
    serverRows.mockReturnValue(ROSTER);
    render(<EmployeesListPage />);
    const box = screen.getByRole("searchbox");
    expect(box).not.toHaveAttribute("aria-busy");

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.type(box, "Ad");
    expect(box).toHaveAttribute("aria-busy", "true");

    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(box).not.toHaveAttribute("aria-busy");
  });
});
