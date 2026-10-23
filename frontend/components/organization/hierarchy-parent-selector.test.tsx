import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HierarchyParentSelector } from "./hierarchy-parent-selector";

const mockUseHierarchyParentOptions = jest.fn();

jest.mock("@/hooks/api/org-hierarchy", () => ({
  useHierarchyParentOptions: (...args: unknown[]) => mockUseHierarchyParentOptions(...args),
}));

function optionsState(overrides: Record<string, unknown>) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
    ...overrides,
  };
}

function renderSelector() {
  const onValueChange = jest.fn();
  render(
    <HierarchyParentSelector
      parentKind="BRANCH"
      value=""
      onValueChange={onValueChange}
      label="Branch"
      placeholder="Select branch"
      searchPlaceholder="Search branches"
      emptyText="No branches"
      optionalLabel="No branch"
    />,
  );
  return { onValueChange };
}

describe("HierarchyParentSelector while its options load", () => {
  it("offers no selectable No branch choice until the list has loaded", async () => {
    mockUseHierarchyParentOptions.mockReturnValue(optionsState({ isLoading: true }));
    renderSelector();
    await userEvent.click(screen.getByRole("combobox", { name: "Branch" }));
    expect(screen.getByRole("status")).toHaveTextContent("Loading options…");
    expect(screen.queryByText("No branch")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("offers No branch and the loaded branches once the list arrives", async () => {
    mockUseHierarchyParentOptions.mockReturnValue(
      optionsState({
        data: {
          pages: [
            { data: [{ id: "b1", name: "Head office", status: "ACTIVE", deletedAt: null }] },
          ],
        },
      }),
    );
    const { onValueChange } = renderSelector();
    await userEvent.click(screen.getByRole("combobox", { name: "Branch" }));
    expect(screen.getByText("No branch")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Head office"));
    expect(onValueChange).toHaveBeenCalledWith("b1");
  });
});
