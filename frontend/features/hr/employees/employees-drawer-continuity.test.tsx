import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EmployeeListItem } from "@/types/hr";
import { EmployeesListPage } from "./employees-list-page";

const replace = jest.fn();
let urlSearch = "q=Ada&dept=d-1";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: jest.fn() }),
  usePathname: () => "/hr/employees",
  useSearchParams: () => new URLSearchParams(urlSearch),
}));
jest.mock("@/hooks/api/use-page-state", () => ({ usePageState: () => ({ kind: "ready" }) }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => false, useCanState: () => "denied" }));
jest.mock("@/features/hr/employees/employees-directory-stats", () => ({
  EmployeesDirectoryStats: () => null,
}));
jest.mock("@/hooks/api/hr/employee-profile", () => ({
  useEmployeeEmployment: () => ({ data: undefined, isLoading: false, isFetching: false }),
}));

const ROW: EmployeeListItem = {
  id: "u-1",
  name: "Ada Lovelace",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.test",
  role: "MEMBER",
  designation: "Engineer",
  employeeId: "E-7",
  image: null,
  isActive: true,
  hasAccepted: true,
  joiningDate: null,
  reportingTo: null,
  department: { id: "d-1", name: "Engineering" },
};

jest.mock("@/hooks/api/hr", () => ({
  useHrDepartments: () => ({ data: [{ id: "d-1", name: "Engineering" }] }),
  useInfiniteHrEmployees: (
    _params: unknown,
    options?: { enabled?: boolean },
  ) => ({
    data: options?.enabled === false ? undefined : { pages: [{ data: [ROW] }] },
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
  }),
}));

beforeEach(() => {
  urlSearch = "q=Ada&dept=d-1";
  replace.mockReset();
});

describe("HRMS-UX-003 — opening a person must not cost the list its filters or its focus", () => {
  it("keeps the search box and the URL untouched across open and close, and restores focus to the row", async () => {
    const user = userEvent.setup();
    render(<EmployeesListPage />);

    const searchBox = screen.getByRole("searchbox");
    expect(searchBox).toHaveValue("Ada");

    const opener = screen.getByRole("link", { name: /Ada Lovelace/ });
    opener.focus();
    await user.click(opener);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    const callsWhileOpen = replace.mock.calls.length;

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("searchbox")).toHaveValue("Ada");
    expect(replace.mock.calls.length).toBe(callsWhileOpen);
    await waitFor(() => expect(opener).toHaveFocus());
  });
});
