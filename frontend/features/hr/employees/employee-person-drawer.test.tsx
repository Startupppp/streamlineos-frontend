import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EmployeeListItem } from "@/types/hr";
import { EmployeePersonDrawer } from "./employee-person-drawer";

const can = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/hr/employees",
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => can(key) }));
jest.mock("@/hooks/api/hr/employee-profile", () => ({
  useEmployeeEmployment: () => ({
    data: {
      id: 7,
      personId: 3,
      employeeNumber: "E-7",
      lifecycleStatus: "ACTIVE",
      workerType: "FULL_TIME",
      departmentId: null,
      designation: "Engineer",
      joiningDate: "2026-01-05",
      probationEndDate: null,
      confirmationDate: "2026-04-05",
      isPrimary: true,
      personFirstName: "Ada",
      personLastName: "Lovelace",
      personWorkEmail: "ada@example.test",
    },
    isLoading: false,
    isFetching: false,
  }),
}));

const PEER: EmployeeListItem = {
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
  joiningDate: "2026-01-05",
  reportingTo: "Sam Manager",
  department: { id: "d-1", name: "Engineering" },
};

beforeEach(() => {
  can.mockReset().mockReturnValue(false);
});

describe("HRMS-UX-003 — person drawer pay gating", () => {
  it("refuses a peer's pay to a manager without payroll:salaries:view", async () => {
    const user = userEvent.setup();
    render(<EmployeePersonDrawer employee={PEER} open onOpenChange={jest.fn()} />);

    await user.click(screen.getByRole("tab", { name: "Pay" }));

    expect(screen.getByText("Pay details restricted")).toBeInTheDocument();
    expect(screen.queryByText("Open pay on the profile")).not.toBeInTheDocument();
  });

  it("asks for payroll:salaries:view and opens the pay panel when it is granted", async () => {
    can.mockImplementation((key: string) => key === "payroll:salaries:view");
    const user = userEvent.setup();
    render(<EmployeePersonDrawer employee={PEER} open onOpenChange={jest.fn()} />);

    await user.click(screen.getByRole("tab", { name: "Pay" }));

    expect(can).toHaveBeenCalledWith("payroll:salaries:view");
    expect(screen.getByText("Open pay on the profile")).toBeInTheDocument();
    expect(screen.queryByText("Pay details restricted")).not.toBeInTheDocument();
  });

  it("deep-links pending exceptions to the Action Center rather than inventing counts", () => {
    render(<EmployeePersonDrawer employee={PEER} open onOpenChange={jest.fn()} />);

    expect(screen.getByRole("link", { name: /Open Action Center/ })).toHaveAttribute(
      "href",
      "/hr/approvals",
    );
  });

  it("renders the employment record without a second read of the list", async () => {
    const user = userEvent.setup();
    render(<EmployeePersonDrawer employee={PEER} open onOpenChange={jest.fn()} />);

    await user.click(screen.getByRole("tab", { name: "Employment" }));

    expect(screen.getByText("Employee number")).toBeInTheDocument();
    expect(screen.getByText("FULL_TIME")).toBeInTheDocument();

  });
});
