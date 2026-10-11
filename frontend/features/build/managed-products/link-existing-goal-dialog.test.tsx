import { fireEvent, render, screen } from "@testing-library/react";
import { LinkExistingGoalDialog } from "./link-existing-goal-dialog";

const mockMutate = jest.fn();
let mockProductGoalsLoading = false;

jest.mock("@/hooks/api/goals", () => ({
  useGoals: (params: { managedProductId?: number }) =>
    params.managedProductId
      ? {
          data: mockProductGoalsLoading ? undefined : [{ id: 37, title: "Linked goal", level: "company" }],
          isLoading: mockProductGoalsLoading,
          isError: false,
          refetch: jest.fn(),
        }
      : {
          data: [
            { id: 38, title: "QA BV Goal", level: "company", productLinkage: null },
            { id: 37, title: "Linked goal", level: "company", productLinkage: null },
          ],
          isLoading: false,
          isError: false,
          refetch: jest.fn(),
        },
  useLinkGoalProduct: () => ({ mutate: mockMutate, isPending: false }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

beforeEach(() => {
  mockMutate.mockReset();
  mockProductGoalsLoading = false;
});

function openPicker() {
  render(<LinkExistingGoalDialog managedProductId={39} open onOpenChange={jest.fn()} />);
  fireEvent.click(screen.getByRole("combobox", { name: "Select a goal to link" }));
}

describe("LinkExistingGoalDialog", () => {
  it("keeps the picked goal selected and links it to the product", () => {
    openPicker();
    fireEvent.click(screen.getByRole("option", { name: /QA BV Goal/ }));

    const linkButton = screen.getByRole("button", { name: "Link goal" });
    expect(linkButton).toBeEnabled();
    fireEvent.click(linkButton);

    expect(mockMutate).toHaveBeenCalledWith(
      { goalId: 38, managedProductId: 39 },
      expect.any(Object),
    );
  });

  it("hides goals already linked to this product and cannot link before a goal is picked", () => {
    openPicker();

    expect(screen.queryByRole("option", { name: /Linked goal/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Link goal" })).toBeDisabled();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("offers no goals until the product's linked goals have loaded", () => {
    mockProductGoalsLoading = true;
    openPicker();

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(screen.getByText("Loading goals…")).toBeInTheDocument();
  });
});
