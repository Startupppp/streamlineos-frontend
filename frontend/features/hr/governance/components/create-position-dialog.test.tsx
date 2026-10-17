import { render, screen } from "@testing-library/react";
import { CreatePositionDialog } from "./create-position-dialog";

let mockDepartmentAccess: "granted" | "denied" = "granted";

jest.mock("@/hooks/api/access", () => ({
  useCanState: () => mockDepartmentAccess,
}));
jest.mock("@/hooks/api/hr/employee-departments", () => ({
  // Disabled without hr:employees:view, exactly as the real hook.
  useHrDepartments: () => ({
    data: mockDepartmentAccess === "granted" ? [{ id: "d1", name: "Engineering" }] : undefined,
  }),
}));
jest.mock("@/features/hr/governance/hooks/use-positions", () => ({
  useCreatePosition: () => ({ mutate: jest.fn(), isPending: false }),
  useSeedPositionStatuses: () => ({ mutate: jest.fn(), isPending: false }),
  usePositionStatuses: () => ({ data: [{ id: 1, name: "open", isActive: true }] }),
}));

describe("CreatePositionDialog department picker", () => {
  it("says the department list is withheld, not absent, when the member cannot view departments", () => {
    mockDepartmentAccess = "denied";
    render(<CreatePositionDialog open onOpenChange={jest.fn()} />);
    expect(screen.getByText(/You need the HR › Employees › View permission/)).toBeInTheDocument();
  });

  it("shows no denial note to a member who can view departments", () => {
    mockDepartmentAccess = "granted";
    render(<CreatePositionDialog open onOpenChange={jest.fn()} />);
    expect(screen.queryByText(/You need the HR › Employees › View permission/)).not.toBeInTheDocument();
  });
});
