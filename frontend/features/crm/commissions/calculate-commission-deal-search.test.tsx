import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CalculateCommissionDialog } from "./commission-run-dialogs";

const useDeals = jest.fn();
jest.mock("@/hooks/api/crm/deals", () => ({
  useDeals: (...args: unknown[]) => useDeals(...args),
}));
jest.mock("@/hooks/api/crm/commission", () => ({
  useCalculateCommission: () => ({ mutate: jest.fn(), isPending: false }),
  useCommissionPlans: () => ({ data: [] }),
  useRebuildCommissionAccrual: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const deal = (id: number, name: string) => ({ id, name, stage: "won" });

describe("CalculateCommissionDialog deal picker", () => {
  beforeEach(() => {
    useDeals.mockReset();
    useDeals.mockImplementation((filters: { search?: string }) => ({
      data: filters.search === "acme" ? [deal(4321, "Acme renewal")] : [deal(1, "First deal")],
      isFetching: false,
    }));
  });

  it("searches the whole book on the server instead of filtering a first page", async () => {
    render(<CalculateCommissionDialog onOpenChange={jest.fn()} />);
    expect(useDeals).toHaveBeenLastCalledWith({ search: undefined, limit: 25 });

    fireEvent.click(screen.getByRole("combobox", { name: "Deal" }));
    fireEvent.change(screen.getByPlaceholderText("Search deals by name…"), { target: { value: "  acme " } });

    await waitFor(() => expect(useDeals).toHaveBeenLastCalledWith({ search: "acme", limit: 25 }));
    fireEvent.click(await screen.findByText("Acme renewal"));

    // The search clears on select; the picked deal keeps its label.
    expect(screen.getByRole("combobox", { name: "Deal" })).toHaveTextContent("Acme renewal");
  });
});
