import { render, screen } from "@testing-library/react";
import { PositionsTable } from "./positions-table";

let canManage = true;

jest.mock("../hooks/use-positions", () => ({
  usePositions: () => ({
    data: { data: [] },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useDeletePosition: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => canManage,
}));

jest.mock("./create-position-dialog", () => ({
  CreatePositionDialog: () => null,
}));

describe("positions empty state", () => {
  it("offers the create action it tells a manager to use", () => {
    canManage = true;
    render(<PositionsTable />);

    expect(
      screen.getByText("Create positions to track roles, incumbents, and org structure."),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Create position" }).length).toBeGreaterThan(0);
  });

  it("does not tell a viewer who cannot create one to create one", () => {
    canManage = false;
    render(<PositionsTable />);

    expect(
      screen.queryByText("Create positions to track roles, incumbents, and org structure."),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create position" })).not.toBeInTheDocument();
    expect(
      screen.getByText("Nobody has created a position yet. Ask an HR administrator to add one."),
    ).toBeInTheDocument();
  });
});
