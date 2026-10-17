import { fireEvent, render, screen, within } from "@testing-library/react";
import type { GoalListItem } from "@/hooks/api/goals";
import { ProductGoalsTableView } from "./product-goals-table-view";

jest.mock("@/components/renderer/use-tenant-layout", () => ({ useTenantLayout: <T,>(l: T): T => l }));

const goal = {
  id: 7,
  title: "Grow weekly actives",
  level: "team",
  status: "at_risk",
  owner: { name: "Asha Rao", email: "asha@example.com" },
  progress: 42,
  keyResultCount: 3,
} as unknown as GoalListItem;

describe("ProductGoalsTableView", () => {
  it("draws each goal through the renderer and opens it on click", () => {
    const onRowClick = jest.fn();
    render(<ProductGoalsTableView goals={[goal]} onRowClick={onRowClick} />);

    for (const header of ["Title", "Level", "Status", "Owner", "Progress", "KRs"])
      expect(screen.getByRole("columnheader", { name: header })).toBeInTheDocument();
    const table = within(screen.getByRole("table"));
    expect(table.getByText("Team")).toBeInTheDocument();
    expect(table.getByText("At Risk")).toBeInTheDocument();
    expect(table.getByText("Asha Rao")).toBeInTheDocument();
    expect(table.getByText("42%")).toBeInTheDocument();
    expect(table.getByText("3")).toBeInTheDocument();

    fireEvent.click(table.getByText("Grow weekly actives"));
    expect(onRowClick).toHaveBeenCalledWith(goal);
  });

  it("shows a dash for a goal with no owner", () => {
    render(<ProductGoalsTableView goals={[{ ...goal, owner: null } as unknown as GoalListItem]} onRowClick={jest.fn()} />);
    expect(within(screen.getByRole("table")).getByText("—")).toBeInTheDocument();
  });
});
