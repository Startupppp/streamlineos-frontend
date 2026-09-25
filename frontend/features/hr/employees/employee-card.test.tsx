/**
 * V-022. The directory summary and the card disagreed in production: the
 * header said "Pending invite: 1" while the one card below it said "Active".
 * `isActive` is set the moment an administrator creates the account, so it
 * cannot answer "has this person accepted".
 */
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EmployeeCard } from "./employee-card";
import type { EmployeeListItem } from "@/types/hr";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

function employee(overrides: Partial<EmployeeListItem> = {}): EmployeeListItem {
  return {
    id: "emp-1",
    name: null,
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.test",
    role: "MEMBER",
    designation: "Engineer",
    employeeId: "E-1",
    image: null,
    isActive: true,
    joiningDate: null,
    reportingTo: null,
    department: null,
    ...overrides,
  };
}

function renderCard(emp: EmployeeListItem) {
  return render(
    <TooltipProvider>
      <EmployeeCard employee={emp} department={null} />
    </TooltipProvider>,
  );
}

describe("EmployeeCard status badge", () => {
  it("badges an invited-but-not-accepted employee Pending, never Active", () => {
    renderCard(employee({ isActive: true, hasAccepted: false }));

    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
  });

  it("badges an accepted employee Active", () => {
    renderCard(employee({ isActive: true, hasAccepted: true }));

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.queryByText("Pending")).not.toBeInTheDocument();
  });

  it("still badges a deactivated account Inactive even when it was never accepted", () => {
    renderCard(employee({ isActive: false, hasAccepted: false }));

    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.queryByText("Pending")).not.toBeInTheDocument();
  });

  it("reads Active on a payload that does not carry acceptance rather than inventing Pending", () => {
    renderCard(employee({ isActive: true }));

    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});
